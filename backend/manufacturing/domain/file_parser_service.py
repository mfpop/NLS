from __future__ import annotations

import os
import csv
import io
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from application.models import ImportSourceConfig


@dataclass
class ParsedColumn:
    name: str
    detected_type: str  # "String", "Integer", "Float", "Date", "Boolean", "Enum"


@dataclass
class ParsedRow:
    row_number: int
    values: list[str | None]
    is_empty: bool = False


@dataclass
class SheetData:
    sheet_name: str
    column_headers: list[str]
    column_types: list[ParsedColumn]
    rows: list[ParsedRow]
    total_rows: int
    empty_required_cells: int = 0
    duplicate_rows: int = 0


@dataclass
class ParseResult:
    file_name: str
    file_path: str
    sheets: list[SheetData]
    active_sheet: str
    total_rows_all_sheets: int
    error: str | None = None


class FileParserError(Exception):
    def __init__(self, message: str, code: str = "PARSE_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class FileParserService:
    """Parse ERP import files (Excel/CSV) into structured data."""

    SAMPLE_ROW_COUNT = 50

    @classmethod
    def parse(cls, file_path: str, source_type: str | None = None) -> ParseResult:
        path = Path(file_path)
        if not path.exists():
            raise FileParserError(f"File not found: {file_path}", "FILE_NOT_FOUND")

        ext = path.suffix.lower()
        if ext in (".xlsx", ".xls"):
            return cls._parse_excel(path)
        elif ext == ".csv" or source_type == "CSV":
            return cls._parse_csv(path)
        else:
            raise FileParserError(f"Unsupported file type: {ext}", "UNSUPPORTED_TYPE")

    @classmethod
    def _parse_excel(cls, path: Path) -> ParseResult:
        try:
            import openpyxl
        except ImportError:
            raise FileParserError("openpyxl is required to parse Excel files", "MISSING_DEPENDENCY")

        try:
            wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
        except Exception as exc:
            raise FileParserError(f"Failed to open Excel file: {exc}", "FILE_OPEN_ERROR")

        sheets: list[SheetData] = []
        active_sheet = wb.active.title if wb.active else ""

        for ws in wb.worksheets:
            sheet_data = cls._parse_excel_sheet(ws)
            if sheet_data:
                sheets.append(sheet_data)

        total_rows = sum(s.total_rows for s in sheets)
        wb.close()

        return ParseResult(
            file_name=path.name,
            file_path=str(path),
            sheets=sheets,
            active_sheet=active_sheet,
            total_rows_all_sheets=total_rows,
        )

    @classmethod
    def _parse_excel_sheet(cls, ws) -> SheetData | None:
        rows_iter = ws.iter_rows(values_only=True)
        all_rows = list(rows_iter)

        if not all_rows:
            return None

        header_row = all_rows[0]
        if not header_row:
            return None

        column_headers = [str(h).strip() if h is not None else f"Column_{i}" for i, h in enumerate(header_row)]
        column_headers = [h if h else f"Column_{i}" for i, h in enumerate(column_headers)]

        data_rows = all_rows[1:]
        total_rows = len(data_rows)

        parsed_rows: list[ParsedRow] = []
        for i, row in enumerate(data_rows):
            values = [str(v).strip() if v is not None else None for v in row]
            # Pad row to match headers
            while len(values) < len(column_headers):
                values.append(None)

            is_empty = all(v is None or v == "" for v in values)
            parsed_rows.append(ParsedRow(
                row_number=i + 2,  # 1-based, after header
                values=values[:len(column_headers)],
                is_empty=is_empty,
            ))

            if len(parsed_rows) >= cls.SAMPLE_ROW_COUNT and i < total_rows - 1:
                # Still sample, we'll keep reading
                pass

        # Detect column types from sample (first 100 non-empty rows)
        non_empty = [r for r in parsed_rows if not r.is_empty][:100]
        column_types = cls._detect_column_types(column_headers, non_empty)

        # Count empty required cells (estimate: cells that are empty but other rows have values)
        empty_required = cls._count_empty_required(parsed_rows, column_types)

        # Count duplicate rows (rows with same values across all columns)
        duplicates = cls._count_duplicates(parsed_rows)

        return SheetData(
            sheet_name=ws.title,
            column_headers=column_headers,
            column_types=column_types,
            rows=parsed_rows[:cls.SAMPLE_ROW_COUNT],
            total_rows=total_rows,
            empty_required_cells=empty_required,
            duplicate_rows=duplicates,
        )

    @classmethod
    def _parse_csv(cls, path: Path) -> ParseResult:
        try:
            with open(path, "r", encoding="utf-8-sig") as f:
                content = f.read()
        except UnicodeDecodeError:
            try:
                with open(path, "r", encoding="latin-1") as f:
                    content = f.read()
            except Exception as exc:
                raise FileParserError(f"Failed to read CSV file: {exc}", "FILE_READ_ERROR")
        except Exception as exc:
            raise FileParserError(f"Failed to read CSV file: {exc}", "FILE_READ_ERROR")

        reader = csv.reader(io.StringIO(content))
        all_rows = list(reader)

        if not all_rows:
            return ParseResult(
                file_name=path.name,
                file_path=str(path),
                sheets=[],
                active_sheet="",
                total_rows_all_sheets=0,
            )

        column_headers = [h.strip() if h else f"Column_{i}" for i, h in enumerate(all_rows[0])]
        data_rows = all_rows[1:]
        total_rows = len(data_rows)

        parsed_rows: list[ParsedRow] = []
        for i, row in enumerate(data_rows):
            values = [v.strip() if v else None for v in row]
            while len(values) < len(column_headers):
                values.append(None)
            is_empty = all(v is None or v == "" for v in values)
            parsed_rows.append(ParsedRow(
                row_number=i + 2,
                values=values[:len(column_headers)],
                is_empty=is_empty,
            ))

        non_empty = [r for r in parsed_rows if not r.is_empty][:100]
        column_types = cls._detect_column_types(column_headers, non_empty)

        empty_required = cls._count_empty_required(parsed_rows, column_types)
        duplicates = cls._count_duplicates(parsed_rows)

        sheet = SheetData(
            sheet_name=path.stem,
            column_headers=column_headers,
            column_types=column_types,
            rows=parsed_rows[:cls.SAMPLE_ROW_COUNT],
            total_rows=total_rows,
            empty_required_cells=empty_required,
            duplicate_rows=duplicates,
        )

        return ParseResult(
            file_name=path.name,
            file_path=str(path),
            sheets=[sheet],
            active_sheet=path.stem,
            total_rows_all_sheets=total_rows,
        )

    @classmethod
    def _detect_column_types(cls, headers: list[str], rows: list[ParsedRow]) -> list[ParsedColumn]:
        if not rows:
            return [ParsedColumn(name=h, detected_type="String") for h in headers]

        types: list[ParsedColumn] = []
        for col_idx, header in enumerate(headers):
            values = []
            for row in rows:
                if col_idx < len(row.values) and row.values[col_idx] is not None:
                    val = row.values[col_idx].strip()
                    if val:
                        values.append(val)

            dtype = cls._infer_type(values, header)
            types.append(ParsedColumn(name=header, detected_type=dtype))

        return types

    @classmethod
    def _infer_type(cls, values: list[str], header: str) -> str:
        if not values:
            return "String"

        # Check for boolean-like values
        bool_set = {"yes", "no", "true", "false", "1", "0", "active", "inactive", "si", "no"}
        if all(v.lower() in bool_set for v in values[:20]):
            return "Boolean"

        # Check for integers
        if all(cls._is_int(v) for v in values[:20]):
            return "Integer"

        # Check for floats
        if all(cls._is_float(v) for v in values[:20]):
            return "Float"

        # Check for dates
        date_keywords = {"date", "fecha", "created", "updated", "modified", "start", "end", "birth"}
        if any(kw in header.lower() for kw in date_keywords):
            if any(cls._is_date(v) for v in values[:10]):
                return "Date"

        # Check for enums (few distinct values)
        distinct = set(v.lower() for v in values[:50])
        if len(distinct) <= 10 and len(values) > 10:
            return "Enum"

        return "String"

    @staticmethod
    def _is_int(v: str) -> bool:
        try:
            int(v.replace(",", ""))
            return True
        except (ValueError, AttributeError):
            return False

    @staticmethod
    def _is_float(v: str) -> bool:
        try:
            float(v.replace(",", ""))
            return True
        except (ValueError, AttributeError):
            return False

    @staticmethod
    def _is_date(v: str) -> bool:
        formats = [
            "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d",
            "%d-%m-%Y", "%m-%d-%Y", "%Y%m%d",
            "%d %b %Y", "%d %B %Y", "%b %d %Y",
        ]
        for fmt in formats:
            try:
                datetime.strptime(v.strip(), fmt)
                return True
            except (ValueError, AttributeError):
                pass
        return False

    @classmethod
    def _count_empty_required(cls, rows: list[ParsedRow], column_types: list[ParsedColumn]) -> int:
        """Estimate cells that are empty in rows where they should have values."""
        count = 0
        for row in rows:
            if row.is_empty:
                continue
            for col_idx, val in enumerate(row.values):
                if col_idx < len(column_types) and (val is None or val == ""):
                    count += 1
        return count

    @classmethod
    def _count_duplicates(cls, rows: list[ParsedRow]) -> int:
        seen = set()
        dup_count = 0
        for row in rows:
            if row.is_empty:
                continue
            key = tuple(row.values)
            if key in seen:
                dup_count += 1
            else:
                seen.add(key)
        return dup_count
