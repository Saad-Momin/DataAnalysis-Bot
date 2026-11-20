import pytest

from app.services import sandbox
from app.services.sandbox_runner import CodeRejected, validate_code

GOOD = [
    "result = df.groupby('region')['revenue'].sum()",
    "result = df.assign(x=df['units'].apply(lambda v: np.sqrt(v))).head(3)",
    "result = pd.to_datetime(df['order_date']).dt.month.value_counts()",
]
BAD = [
    "import os\nresult = 1",
    "result = df.__class__",
    "result = '{0.__class__}'.format(df)",
    "result = pd.io.common.os.getcwd()",
    "p = pd\nresult = p.io",
    "result = open('x').read()",
    "df.to_csv('x.csv')\nresult = 1",
    "result = pd.read_csv('x.csv')",
    "result = df.eval('units*2')",
    "result = df.query('units > 1')",
    "result = getattr(df, 'units')",
    "x = 1",  # no `result`
    "def f():\n    pass\nresult = 1",
    "result = (",  # syntax error
]


@pytest.mark.parametrize("code", GOOD)
def test_valid_code_passes_guard(code):
    validate_code(code)


@pytest.mark.parametrize("code", BAD)
def test_dangerous_code_is_rejected(code):
    with pytest.raises(CodeRejected):
        validate_code(code)


def test_execution_and_serialization(dataset_id):
    r = sandbox.run_analysis(dataset_id, "result = df.groupby('region')['revenue'].sum().round(2)")
    assert r["kind"] == "table" and r["columns"] == ["region", "revenue"] and len(r["rows"]) == 3
    # unnamed integer index left over from sorting must not leak as an 'index' column
    r = sandbox.run_analysis(dataset_id, "result = df.sort_values('revenue').head(2)[['region', 'revenue']]")
    assert r["columns"] == ["region", "revenue"]
    assert sandbox.run_analysis(dataset_id, "result = int(df['units'].sum())")["kind"] == "scalar"


def test_runtime_error_is_reported_not_raised_raw(dataset_id):
    with pytest.raises(sandbox.SandboxError, match="KeyError"):
        sandbox.run_analysis(dataset_id, "result = df['nope'].sum()")


def test_timeout_kills_runaway_code(dataset_id, monkeypatch):
    monkeypatch.setattr(sandbox, "TIMEOUT_S", 2)
    with pytest.raises(sandbox.SandboxError, match="timed out"):
        sandbox.run_analysis(dataset_id, "while True:\n    pass\nresult = 1")
