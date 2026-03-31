import argparse
import json
from pathlib import Path

from import_selected_q3_workbook import canonical_indicator_key, load_workbook, parse_sheet


DEFAULT_WORKBOOK = (
    r"C:\Users\dekok\Downloads\Q3 REPORTS (1)\Q3 REPORTS\BONELQ Q3 2026"
    r"\BONELA- NAHPA REPORTING TEMPLATE 2025-26   Q3 report (1).xlsx"
)
DEFAULT_TOTAL_SHEET = "TOTAL"
DEFAULT_EXCLUDE_SHEETS = {"TOTAL", "INDICATOR MATRIX"}
DEFAULT_REPORT_PATH = "reports/bonela-total-sheet-audit.json"


def to_number(value):
    if value is None:
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def derive_total(payload):
    disaggregates = payload.get("disaggregates")
    if not isinstance(disaggregates, dict):
        return to_number(payload.get("total"))

    total = 0.0
    found = False
    for secondary_map in disaggregates.values():
        if not isinstance(secondary_map, dict):
            continue
        for band_map in secondary_map.values():
            if not isinstance(band_map, dict):
                continue
            for band, value in band_map.items():
                if str(band).strip().lower() == "ayp (10-24)":
                    continue
                total += to_number(value)
                found = True
    return total if found else to_number(payload.get("total"))


def item_key(item):
    return (str(item.get("code", "")).strip(), canonical_indicator_key(item.get("title", "")))


def parse_args():
    parser = argparse.ArgumentParser(description="Audit workbook TOTAL sheet against summed organization sheets.")
    parser.add_argument("--workbook", default=DEFAULT_WORKBOOK)
    parser.add_argument("--total-sheet", default=DEFAULT_TOTAL_SHEET)
    parser.add_argument("--report-path", default=DEFAULT_REPORT_PATH)
    return parser.parse_args()


def main():
    args = parse_args()
    workbook = load_workbook(Path(args.workbook), data_only=True)
    if args.total_sheet not in workbook.sheetnames:
        raise SystemExit(f"TOTAL sheet not found: {args.total_sheet}")

    total_items = parse_sheet(workbook[args.total_sheet])
    org_sheet_names = [name for name in workbook.sheetnames if name not in DEFAULT_EXCLUDE_SHEETS]

    org_sums = {}
    for sheet_name in org_sheet_names:
        for item in parse_sheet(workbook[sheet_name]):
            key = item_key(item)
            entry = org_sums.setdefault(
                key,
                {
                    "code": item["code"],
                    "name": item["title"],
                    "sumOfOrgRowTotals": 0.0,
                    "sumOfOrgDerivedTotals": 0.0,
                },
            )
            entry["sumOfOrgRowTotals"] += to_number(item["value"].get("total"))
            entry["sumOfOrgDerivedTotals"] += derive_total(item["value"])

    comparison = []
    for item in total_items:
        key = item_key(item)
        org_entry = org_sums.get(
            key,
            {
                "sumOfOrgRowTotals": 0.0,
                "sumOfOrgDerivedTotals": 0.0,
            },
        )
        total_sheet_row_total = to_number(item["value"].get("total"))
        total_sheet_derived_total = derive_total(item["value"])
        sum_of_org_row_totals = org_entry["sumOfOrgRowTotals"]
        sum_of_org_derived_totals = org_entry["sumOfOrgDerivedTotals"]
        comparison.append(
            {
                "code": item["code"],
                "name": item["title"],
                "totalSheetRowTotal": int(total_sheet_row_total) if total_sheet_row_total.is_integer() else total_sheet_row_total,
                "totalSheetDerivedTotal": int(total_sheet_derived_total) if total_sheet_derived_total.is_integer() else total_sheet_derived_total,
                "sumOfOrgRowTotals": int(sum_of_org_row_totals) if sum_of_org_row_totals.is_integer() else sum_of_org_row_totals,
                "sumOfOrgDerivedTotals": int(sum_of_org_derived_totals) if sum_of_org_derived_totals.is_integer() else sum_of_org_derived_totals,
                "totalSheetMatchesOrgDerived": abs(total_sheet_derived_total - sum_of_org_derived_totals) < 1e-9,
                "totalSheetRowMatchesOrgDerived": abs(total_sheet_row_total - sum_of_org_derived_totals) < 1e-9,
            }
        )

    mismatches = [item for item in comparison if not item["totalSheetMatchesOrgDerived"]]
    report = {
        "workbook": args.workbook,
        "totalSheet": args.total_sheet,
        "organizationSheets": org_sheet_names,
        "totalIndicatorsOnTotalSheet": len(total_items),
        "mismatchedIndicators": len(mismatches),
        "mismatches": mismatches,
        "comparison": comparison,
    }

    report_path = Path(args.report_path)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(json.dumps({"totalIndicatorsOnTotalSheet": len(total_items), "mismatchedIndicators": len(mismatches)}, indent=2))
    print(f"Saved report: {report_path}")


if __name__ == "__main__":
    main()
