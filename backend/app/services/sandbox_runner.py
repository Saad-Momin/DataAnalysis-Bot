"""Sandboxed execution of LLM-generated Pandas code.

SELF-CONTAINED ON PURPOSE: the parent imports `validate_code` for a fast pre-check, and the same file is
launched as a script in an isolated interpreter (`python -I`) that loads the dataset from Parquet, re-validates
the code, runs it with restricted builtins and prints one JSON result. The parent enforces a wall-clock timeout
and scrubs secrets from the child's environment.
"""
import ast
import json
import sys

MAX_CODE_CHARS = 6000
MARKER = "@@RESULT@@"

# Module-level attributes the generated code may use (everything else on pd/np is rejected, which also
# closes escapes such as pd.io.common.os).
ALLOWED_PD = {
    "DataFrame", "Series", "to_datetime", "to_numeric", "to_timedelta", "concat", "merge", "cut", "qcut",
    "isna", "isnull", "notna", "notnull", "Timestamp", "Timedelta", "DateOffset", "date_range", "NA", "NaT",
    "Categorical", "get_dummies", "pivot_table", "crosstab", "unique", "Grouper", "melt", "factorize",
    "Period", "period_range", "Interval", "offsets",
}
ALLOWED_NP = {
    "nan", "inf", "pi", "mean", "median", "sum", "std", "var", "min", "max", "abs", "sqrt", "log", "log1p",
    "log10", "exp", "round", "where", "select", "arange", "linspace", "array", "percentile", "quantile",
    "nanmean", "nanmedian", "nansum", "nanstd", "nanmax", "nanmin", "isnan", "isfinite", "clip", "floor",
    "ceil", "corrcoef", "cumsum", "cumprod", "diff", "sign", "power", "int64", "float64", "int32", "float32",
    "bool_", "argmax", "argmin", "unique", "sort", "argsort", "polyfit", "polyval", "histogram", "maximum",
    "minimum", "ptp", "average", "prod", "count_nonzero", "digitize", "mod", "add", "subtract", "multiply",
    "divide", "isin", "any", "all", "nan_to_num", "datetime64", "timedelta64",
}
# Methods that read/write files, run expressions, render, or expose raw memory.
BLOCKED_ATTRS = {
    "eval", "query", "format", "format_map", "plot", "hist", "boxplot", "style", "tofile", "dump", "dumps",
    "ctypes", "load", "loads", "system", "popen", "open", "save", "savetxt", "fromfile", "memmap",
}
ALLOWED_TO = {
    "to_datetime", "to_numeric", "to_timedelta", "to_period", "to_timestamp", "to_list", "to_dict", "to_frame",
    "to_numpy", "to_pydatetime", "to_series",
}
FORBIDDEN_NAMES = {
    "open", "exec", "eval", "compile", "getattr", "setattr", "delattr", "globals", "locals", "vars", "input",
    "breakpoint", "type", "dir", "help", "memoryview", "object", "super", "classmethod", "staticmethod",
    "property",
}
_FORBIDDEN_NODE_NAMES = (
    "Import", "ImportFrom", "Global", "Nonlocal", "ClassDef", "FunctionDef", "AsyncFunctionDef", "Await",
    "Yield", "YieldFrom", "With", "AsyncWith", "Try", "TryStar", "Raise", "Delete", "AsyncFor",
)
FORBIDDEN_NODES = tuple(getattr(ast, n) for n in _FORBIDDEN_NODE_NAMES if hasattr(ast, n))


class CodeRejected(Exception):
    pass


class _Guard(ast.NodeVisitor):
    def generic_visit(self, node):
        if isinstance(node, FORBIDDEN_NODES):
            raise CodeRejected(f"'{type(node).__name__}' statements are not allowed.")
        super().generic_visit(node)

    def visit_Name(self, node):
        if node.id.startswith("_"):
            raise CodeRejected("Names starting with an underscore are not allowed.")
        if node.id in ("pd", "np"):
            raise CodeRejected(f"Use '{node.id}.<function>' directly; '{node.id}' cannot be aliased or passed around.")
        if node.id in FORBIDDEN_NAMES:
            raise CodeRejected(f"'{node.id}' is not allowed.")

    def visit_Attribute(self, node):
        base = node.value
        if isinstance(base, ast.Name) and base.id in ("pd", "np"):
            allowed = ALLOWED_PD if base.id == "pd" else ALLOWED_NP
            if node.attr not in allowed:
                raise CodeRejected(f"'{base.id}.{node.attr}' is not available.")
            return
        attr = node.attr
        if attr.startswith("_"):
            raise CodeRejected("Attributes starting with an underscore are not allowed.")
        if attr in BLOCKED_ATTRS or attr.startswith("read_") or (attr.startswith("to_") and attr not in ALLOWED_TO):
            raise CodeRejected(f"'.{attr}' is not allowed.")
        self.generic_visit(node)


def validate_code(code: str) -> None:
    if not code or not code.strip():
        raise CodeRejected("No code was produced.")
    if len(code) > MAX_CODE_CHARS:
        raise CodeRejected("Code is too long.")
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        raise CodeRejected(f"Syntax error: {e.msg} (line {e.lineno}).") from None
    _Guard().visit(tree)
    if not any(isinstance(n, ast.Name) and n.id == "result" and isinstance(n.ctx, ast.Store) for n in ast.walk(tree)):
        raise CodeRejected("The code must assign its final answer to a variable named `result`.")


SAFE_BUILTINS_NAMES = (
    "len range min max sum abs round sorted list dict set tuple str int float bool enumerate zip map filter any "
    "all isinstance reversed divmod pow slice frozenset"
).split()


def _safe_builtins() -> dict:
    import builtins

    return {n: getattr(builtins, n) for n in SAFE_BUILTINS_NAMES}


def _json_scalar(v):
    import pandas as pd

    if v is None:
        return None
    if isinstance(v, pd.Timestamp):
        return v.isoformat()
    if hasattr(v, "item"):
        try:
            v = v.item()
        except Exception:
            return str(v)
    if isinstance(v, float) and (v != v or v in (float("inf"), float("-inf"))):
        return None
    if v is pd.NaT or v is pd.NA:
        return None
    return v if isinstance(v, (str, int, float, bool)) else str(v)


def serialize(obj, max_rows: int) -> dict:
    import pandas as pd

    if isinstance(obj, pd.Series):
        obj = obj.to_frame(str(obj.name) if obj.name is not None else "value")
    if isinstance(obj, pd.DataFrame):
        df = obj
        idx = df.index
        # Keep an index only when it carries meaning (named, multi-level, or labels/dates). An unnamed
        # integer index is just row positions left over from sorting/filtering.
        meaningful = (
            isinstance(idx, pd.MultiIndex)
            or any(n is not None for n in idx.names)
            or not pd.api.types.is_integer_dtype(idx)
        )
        if meaningful and not isinstance(idx, pd.RangeIndex):
            df = df.reset_index()
        total = int(df.shape[0])
        df = df.head(max_rows).copy()
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = ["_".join(map(str, c)) for c in df.columns]
        df.columns = [str(c) for c in df.columns]
        if df.columns.duplicated().any():
            raise ValueError("Result has duplicate column names; rename them.")
        rows = json.loads(df.to_json(orient="records", date_format="iso"))
        return {"kind": "table", "columns": list(df.columns), "rows": rows, "total_rows": total, "truncated": total > max_rows}
    if isinstance(obj, dict):
        return {"kind": "dict", "value": {str(k): _json_scalar(v) for k, v in list(obj.items())[:200]}}
    if isinstance(obj, (list, tuple)):
        return {"kind": "list", "value": [_json_scalar(v) for v in list(obj)[:200]]}
    if hasattr(obj, "tolist") and getattr(obj, "ndim", 0) >= 1:
        return {"kind": "list", "value": [_json_scalar(v) for v in obj.tolist()[:200]]}
    return {"kind": "scalar", "value": _json_scalar(obj)}


def execute(parquet_path: str, code: str, max_rows: int) -> dict:
    import numpy as np
    import pandas as pd

    validate_code(code)
    df = pd.read_parquet(parquet_path)
    env = {"__builtins__": _safe_builtins(), "pd": pd, "np": np, "df": df}
    exec(compile(code, "<analysis>", "exec"), env)  # noqa: S102 - validated + isolated process
    if "result" not in env:
        raise ValueError("`result` was not set.")
    return serialize(env["result"], max_rows)


def _main() -> None:
    req = json.loads(sys.stdin.read())
    try:
        out = {"ok": True, "result": execute(req["parquet"], req["code"], int(req["max_rows"]))}
    except CodeRejected as e:
        out = {"ok": False, "error_type": "rejected", "error": str(e)}
    except BaseException as e:  # noqa: BLE001 - report anything the generated code raised
        out = {"ok": False, "error_type": "runtime", "error": f"{type(e).__name__}: {e}"[:500]}
    sys.stdout.write("\n" + MARKER + json.dumps(out, ensure_ascii=True) + "\n")


if __name__ == "__main__":
    _main()
