"""
Data Catalog & Metadata Engine for DataPilot AI.
Provides schema browsing, table relationships, and column metadata without accessing row data.
"""
from typing import Dict, List, Any, Optional

METADATA_STORE: Dict[str, Any] = {
    "conn_sap_hana": {
        "system_name": "SAP HANA ERP",
        "system_type": "sap_hana",
        "database": "HDB",
        "schemas": {
            "ERP_SALES": {
                "description": "SAP Sales & Distribution core operational tables",
                "tables": {
                    "CUSTOMERS": {
                        "description": "Master account records for commercial enterprise and SMB clients",
                        "est_rows": 142500,
                        "columns": [
                            {"name": "CUSTOMER_ID", "type": "VARCHAR(32)", "is_pk": True, "is_fk": False, "nullable": False, "description": "Unique client enterprise identifier"},
                            {"name": "COMPANY_NAME", "type": "VARCHAR(100)", "is_pk": False, "is_fk": False, "nullable": False, "description": "Client trading entity name"},
                            {"name": "COUNTRY", "type": "VARCHAR(50)", "is_pk": False, "is_fk": False, "nullable": True, "description": "ISO country of commercial incorporation"},
                            {"name": "CUSTOMER_TIER", "type": "VARCHAR(20)", "is_pk": False, "is_fk": False, "nullable": True, "description": "Enterprise, Mid-Market, Growth"},
                            {"name": "CREATED_DATE", "type": "TIMESTAMP", "is_pk": False, "is_fk": False, "nullable": False, "description": "Original account onboarding timestamp"},
                            {"name": "IS_ACTIVE", "type": "BOOLEAN", "is_pk": False, "is_fk": False, "nullable": False, "description": "Active commercial agreement flag"}
                        ],
                        "relationships": [
                            {"from_column": "CUSTOMER_ID", "to_table": "ORDERS", "to_column": "CUSTOMER_ID", "type": "1:N"}
                        ]
                    },
                    "ORDERS": {
                        "description": "Sales order transactions, fulfillment status, and financial amounts",
                        "est_rows": 1840200,
                        "columns": [
                            {"name": "ORDER_ID", "type": "VARCHAR(32)", "is_pk": True, "is_fk": False, "nullable": False, "description": "Unique order header document number"},
                            {"name": "CUSTOMER_ID", "type": "VARCHAR(32)", "is_pk": False, "is_fk": True, "fk_table": "CUSTOMERS", "fk_column": "CUSTOMER_ID", "nullable": False, "description": "Reference to purchasing customer account"},
                            {"name": "ORDER_DATE", "type": "DATE", "is_pk": False, "is_fk": False, "nullable": False, "description": "Date transaction was placed"},
                            {"name": "ORDER_STATUS", "type": "VARCHAR(20)", "is_pk": False, "is_fk": False, "nullable": False, "description": "COMPLETED, PENDING, CANCELLED, REFUNDED"},
                            {"name": "TOTAL_AMOUNT", "type": "DECIMAL(12,2)", "is_pk": False, "is_fk": False, "nullable": False, "description": "Gross invoice balance in local settlement currency"},
                            {"name": "CURRENCY", "type": "VARCHAR(3)", "is_pk": False, "is_fk": False, "nullable": False, "description": "ISO 4217 Currency (USD, EUR, GBP)"},
                            {"name": "SALES_REP_ID", "type": "VARCHAR(32)", "is_pk": False, "is_fk": False, "nullable": True, "description": "Assigned enterprise account executive ID"}
                        ],
                        "relationships": [
                            {"from_column": "CUSTOMER_ID", "to_table": "CUSTOMERS", "to_column": "CUSTOMER_ID", "type": "N:1"},
                            {"from_column": "ORDER_ID", "to_table": "ORDER_ITEMS", "to_column": "ORDER_ID", "type": "1:N"}
                        ]
                    },
                    "ORDER_ITEMS": {
                        "description": "Line-item inventory items per order header",
                        "est_rows": 5920000,
                        "columns": [
                            {"name": "ITEM_ID", "type": "VARCHAR(32)", "is_pk": True, "is_fk": False, "nullable": False, "description": "Unique order item line number"},
                            {"name": "ORDER_ID", "type": "VARCHAR(32)", "is_pk": False, "is_fk": True, "fk_table": "ORDERS", "fk_column": "ORDER_ID", "nullable": False, "description": "Parent order header identifier"},
                            {"name": "PRODUCT_ID", "type": "VARCHAR(32)", "is_pk": False, "is_fk": True, "fk_table": "PRODUCTS", "fk_column": "PRODUCT_ID", "nullable": False, "description": "SKU catalog identifier"},
                            {"name": "QUANTITY", "type": "INTEGER", "is_pk": False, "is_fk": False, "nullable": False, "description": "Units billed"},
                            {"name": "UNIT_PRICE", "type": "DECIMAL(10,2)", "is_pk": False, "is_fk": False, "nullable": False, "description": "Agreed unit selling price"},
                            {"name": "DISCOUNT", "type": "DECIMAL(4,2)", "is_pk": False, "is_fk": False, "nullable": False, "description": "Contractual percentage discount applied"}
                        ]
                    },
                    "PRODUCTS": {
                        "description": "Commercial SKU master catalog and pricing tiers",
                        "est_rows": 12400,
                        "columns": [
                            {"name": "PRODUCT_ID", "type": "VARCHAR(32)", "is_pk": True, "is_fk": False, "nullable": False, "description": "Global SKU identifier"},
                            {"name": "PRODUCT_NAME", "type": "VARCHAR(100)", "is_pk": False, "is_fk": False, "nullable": False, "description": "Commercial catalog product name"},
                            {"name": "CATEGORY", "type": "VARCHAR(50)", "is_pk": False, "is_fk": False, "nullable": True, "description": "Merchandising department taxonomy"},
                            {"name": "COST_PRICE", "type": "DECIMAL(10,2)", "is_pk": False, "is_fk": False, "nullable": False, "description": "Standard inventory manufacturing cost"},
                            {"name": "LIST_PRICE", "type": "DECIMAL(10,2)", "is_pk": False, "is_fk": False, "nullable": False, "description": "MSRP baseline consumer list price"}
                        ]
                    }
                }
            }
        }
    },
    "conn_snowflake": {
        "system_name": "Snowflake Analytics DW",
        "system_type": "snowflake",
        "database": "ANALYTICS_DW",
        "schemas": {
            "EDW_REPORTING": {
                "description": "Central Enterprise Data Warehouse dimensional marts & production analytics views",
                "tables": {
                    "DAILY_REVENUE_METRICS": {
                        "description": "Aggregated daily GAAP revenue across global operating entities",
                        "est_rows": 3650,
                        "columns": [
                            {"name": "METRIC_DATE", "type": "DATE", "is_pk": True, "is_fk": False, "nullable": False, "description": "Accounting calendar date"},
                            {"name": "GROSS_REVENUE", "type": "DECIMAL(14,2)", "is_pk": False, "is_fk": False, "nullable": False, "description": "Total booked volume"},
                            {"name": "NET_REVENUE", "type": "DECIMAL(14,2)", "is_pk": False, "is_fk": False, "nullable": False, "description": "Net revenue after returns and deductions"}
                        ]
                    },
                    "CUSTOMER_CHURN_PREDICTION_FEATURES": {
                        "description": "Feature store inputs for retention machine learning pipelines",
                        "est_rows": 142500,
                        "columns": [
                            {"name": "CUSTOMER_ID", "type": "VARCHAR(32)", "is_pk": True, "is_fk": False, "nullable": False, "description": "Unique client ID"},
                            {"name": "DAYS_SINCE_LAST_ORDER", "type": "INTEGER", "is_pk": False, "is_fk": False, "nullable": False, "description": "Recency feature in days"},
                            {"name": "LIFETIME_ORDER_VALUE", "type": "DECIMAL(14,2)", "is_pk": False, "is_fk": False, "nullable": False, "description": "Historical monetary sum"}
                        ]
                    }
                }
            }
        }
    },
    "conn_postgres": {
        "system_name": "PostgreSQL Core App",
        "system_type": "postgres",
        "database": "app_production",
        "schemas": {
            "CORE_APP": {
                "description": "SaaS application multi-tenant operational database",
                "tables": {
                    "USERS": {
                        "description": "Application identity, authorization and login records",
                        "est_rows": 850000,
                        "columns": [
                            {"name": "USER_ID", "type": "UUID", "is_pk": True, "is_fk": False, "nullable": False, "description": "Application user UUID"},
                            {"name": "EMAIL", "type": "VARCHAR(255)", "is_pk": False, "is_fk": False, "nullable": False, "description": "Verified login identity"},
                            {"name": "ROLE", "type": "VARCHAR(30)", "is_pk": False, "is_fk": False, "nullable": False, "description": "Admin, Member, Viewer"}
                        ]
                    }
                }
            }
        }
    },
    "conn_stripe_api": {
        "system_name": "Stripe Billing REST API",
        "system_type": "rest_api",
        "database": "REST_CATALOG",
        "schemas": {
            "BILLING_V1": {
                "description": "Stripe OpenAPI v1 ingest specification",
                "tables": {
                    "CHARGES": {
                        "description": "Credit card and ACH payment ledger receipts",
                        "est_rows": 480000,
                        "columns": [
                            {"name": "CHARGE_ID", "type": "VARCHAR(64)", "is_pk": True, "is_fk": False, "nullable": False, "description": "Stripe charge ch_xxx token"},
                            {"name": "AMOUNT_CENTS", "type": "INTEGER", "is_pk": False, "is_fk": False, "nullable": False, "description": "Amount in smallest currency unit"},
                            {"name": "STATUS", "type": "VARCHAR(20)", "is_pk": False, "is_fk": False, "nullable": False, "description": "succeeded, failed"}
                        ]
                    }
                }
            }
        }
    }
}

def get_connection_metadata(conn_id: str) -> Optional[Dict[str, Any]]:
    return METADATA_STORE.get(conn_id)

def get_all_catalog() -> Dict[str, Any]:
    return METADATA_STORE

def search_tables(query: str) -> List[Dict[str, Any]]:
    """Searches across all schemas for matching tables or column names."""
    query = query.lower()
    results = []
    for conn_id, conn_data in METADATA_STORE.items():
        for schema_name, schema_data in conn_data.get("schemas", {}).items():
            for table_name, table_data in schema_data.get("tables", {}).items():
                col_names = [c["name"].lower() for c in table_data.get("columns", [])]
                if query in table_name.lower() or query in schema_name.lower() or any(query in c for c in col_names):
                    results.append({
                        "connection_id": conn_id,
                        "connection_name": conn_data["system_name"],
                        "schema": schema_name,
                        "table": table_name,
                        "description": table_data.get("description", ""),
                        "columns_count": len(table_data.get("columns", [])),
                        "est_rows": table_data.get("est_rows", 0)
                    })
    return results
