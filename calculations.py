"""
Farm Financial Analytics Engine (Python 3.9+)
Calculates annual financial summaries, enterprise margins, and key performance indicators.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime


def calculate_farm_annual_summary(transactions: List[Dict[str, Any]], target_year: Optional[int] = None) -> Dict[str, Any]:
    """
    Accepts a list of farm financial transactions for a single farming year and computes:
      1. Total Annual Income
      2. Total Annual Expenses (grouped by category)
      3. Net Annual Profit
      4. Profit Margin Percentage
      5. Most Profitable Crop & Highest Expense Category
      6. Crop-by-Crop Performance Breakdown
      7. Monthly Income vs. Expense Trend

    Each transaction object schema:
      {
        "id": 1,
        "type": "income" | "expense",
        "category": "crop_sales" | "seeds" | "fertilizer" | ...,
        "crop_type": "Corn" | "Soybeans" | None (for general farm overhead/subsidies),
        "amount": 12500.00,
        "date": "2026-04-15"
      }
    """
    if not isinstance(transactions, list):
        raise TypeError("Transactions must be a list of dictionaries")

    # Filter by target_year if specified
    filtered_txs = []
    for tx in transactions:
        tx_date_str = tx.get("date", "")
        if target_year:
            try:
                tx_year = datetime.fromisoformat(str(tx_date_str)).year
                if tx_year != target_year:
                    continue
            except (ValueError, TypeError):
                # Fallback check if date is string starting with year
                if not str(tx_date_str).startswith(str(target_year)):
                    continue
        filtered_txs.append(tx)

    total_income = 0.0
    total_expenses = 0.0
    expenses_by_category: Dict[str, float] = {}
    income_by_category: Dict[str, float] = {}
    crop_financials: Dict[str, Dict[str, float]] = {}
    monthly_trend: Dict[int, Dict[str, float]] = {m: {"income": 0.0, "expense": 0.0} for m in range(1, 13)}

    for tx in filtered_txs:
        tx_type = str(tx.get("type", "")).strip().lower()
        amount = float(tx.get("amount") or 0.0)
        category = str(tx.get("category", "Uncategorized")).strip()
        crop = tx.get("crop_type")
        crop_name = str(crop).strip() if crop and str(crop).strip().lower() not in ["none", "null", ""] else None

        # Parse month
        month = 1
        try:
            month = datetime.fromisoformat(str(tx.get("date", ""))).month
        except (ValueError, TypeError):
            try:
                parts = str(tx.get("date", "")).split("-")
                if len(parts) >= 2:
                    month = int(parts[1])
            except Exception:
                month = 1

        if tx_type == "income":
            total_income += amount
            income_by_category[category] = income_by_category.get(category, 0.0) + amount
            monthly_trend[month]["income"] += amount

            if crop_name:
                if crop_name not in crop_financials:
                    crop_financials[crop_name] = {"income": 0.0, "expense": 0.0}
                crop_financials[crop_name]["income"] += amount

        elif tx_type == "expense":
            total_expenses += amount
            expenses_by_category[category] = expenses_by_category.get(category, 0.0) + amount
            monthly_trend[month]["expense"] += amount

            if crop_name:
                if crop_name not in crop_financials:
                    crop_financials[crop_name] = {"income": 0.0, "expense": 0.0}
                crop_financials[crop_name]["expense"] += amount

    # 1. Round high-level metrics
    total_income = round(total_income, 2)
    total_expenses = round(total_expenses, 2)
    net_profit = round(total_income - total_expenses, 2)

    # 2. Profit Margin Percentage: (Net Profit / Total Income) * 100
    profit_margin_pct = round((net_profit / total_income * 100), 2) if total_income > 0 else 0.0

    # 3. Round Expenses & Income by Category + percentages
    formatted_expenses_by_cat = {}
    for cat, amt in expenses_by_category.items():
        pct_of_total_expense = round((amt / total_expenses * 100), 1) if total_expenses > 0 else 0.0
        formatted_expenses_by_cat[cat] = {
            "amount": round(amt, 2),
            "percentage_of_expenses": pct_of_total_expense
        }

    # 4. Highest Expense Category
    highest_expense_category = None
    highest_expense_amount = 0.0
    if expenses_by_category:
        highest_cat = max(expenses_by_category.items(), key=lambda item: item[1])
        highest_expense_category = highest_cat[0]
        highest_expense_amount = round(highest_cat[1], 2)

    # 5. Crop Breakdown and Most Profitable Crop
    crop_performance = []
    most_profitable_crop = None
    highest_crop_profit = float("-inf")

    for c_name, data in crop_financials.items():
        c_inc = round(data["income"], 2)
        c_exp = round(data["expense"], 2)
        c_net = round(c_inc - c_exp, 2)
        c_margin = round((c_net / c_inc * 100), 2) if c_inc > 0 else 0.0

        crop_entry = {
            "crop": c_name,
            "revenue": c_inc,
            "expenses": c_exp,
            "net_profit": c_net,
            "margin_percentage": c_margin
        }
        crop_performance.append(crop_entry)

        if c_net > highest_crop_profit:
            highest_crop_profit = c_net
            most_profitable_crop = {
                "crop": c_name,
                "net_profit": c_net,
                "margin_percentage": c_margin
            }

    # Sort crops by net profit descending
    crop_performance.sort(key=lambda x: x["net_profit"], reverse=True)

    # Format monthly trend
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_summary = [
        {
            "month_num": m,
            "month_name": month_names[m - 1],
            "income": round(monthly_trend[m]["income"], 2),
            "expense": round(monthly_trend[m]["expense"], 2),
            "net": round(monthly_trend[m]["income"] - monthly_trend[m]["expense"], 2)
        }
        for m in range(1, 13)
    ]

    return {
        "total_annual_income": total_income,
        "total_annual_expenses": total_expenses,
        "net_annual_profit": net_profit,
        "profit_margin_percentage": profit_margin_pct,
        "highest_expense_category": {
            "category": highest_expense_category,
            "amount": highest_expense_amount
        } if highest_expense_category else None,
        "most_profitable_crop": most_profitable_crop,
        "expenses_by_category": formatted_expenses_by_cat,
        "crop_performance": crop_performance,
        "monthly_trend": monthly_summary
    }


# Demo execution test
if __name__ == "__main__":
    import json

    sample_transactions = [
        # Income
        {"id": 1, "type": "income", "category": "Crop Sales", "crop_type": "Corn", "amount": 92500.00, "date": "2026-10-12"},
        {"id": 2, "type": "income", "category": "Crop Sales", "crop_type": "Soybeans", "amount": 68000.00, "date": "2026-10-28"},
        {"id": 3, "type": "income", "category": "Crop Sales", "crop_type": "Wheat", "amount": 34000.00, "date": "2026-07-15"},
        {"id": 4, "type": "income", "category": "Government Subsidy", "crop_type": None, "amount": 14500.00, "date": "2026-05-20"},
        {"id": 5, "type": "income", "category": "Pasture Leasing", "crop_type": None, "amount": 6000.00, "date": "2026-03-01"},

        # Expenses
        {"id": 6, "type": "expense", "category": "Fertilizer & Lime", "crop_type": "Corn", "amount": 28400.00, "date": "2026-04-10"},
        {"id": 7, "type": "expense", "category": "Seeds", "crop_type": "Corn", "amount": 16200.00, "date": "2026-03-15"},
        {"id": 8, "type": "expense", "category": "Seeds", "crop_type": "Soybeans", "amount": 12800.00, "date": "2026-04-20"},
        {"id": 9, "type": "expense", "category": "Fuel & Diesel", "crop_type": None, "amount": 18500.00, "date": "2026-06-14"},
        {"id": 10, "type": "expense", "category": "Hired Labor", "crop_type": None, "amount": 22000.00, "date": "2026-08-30"},
        {"id": 11, "type": "expense", "category": "Land Rent", "crop_type": "Wheat", "amount": 14000.00, "date": "2026-02-01"},
        {"id": 12, "type": "expense", "category": "Water & Irrigation", "crop_type": "Corn", "amount": 7800.00, "date": "2026-07-22"}
    ]

    summary = calculate_farm_annual_summary(sample_transactions, target_year=2026)
    print(json.dumps(summary, indent=2))
