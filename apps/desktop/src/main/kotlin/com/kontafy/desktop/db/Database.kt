package com.kontafy.desktop.db

import com.kontafy.desktop.db.tables.*
import com.kontafy.desktop.db.repositories.UserRepository
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File
import java.time.LocalDateTime

object KontafyDatabase {
    private var database: Database? = null

    fun init() {
        val dbDir = File(System.getProperty("user.home"), ".kontafy")
        if (!dbDir.exists()) {
            dbDir.mkdirs()
        }

        val dbFile = File(dbDir, "kontafy.db")
        val url = "jdbc:sqlite:${dbFile.absolutePath}"

        // Connect with SQLite pragmas set via JDBC properties
        database = Database.connect(
            url = url,
            driver = "org.sqlite.JDBC",
            setupConnection = { connection ->
                connection.createStatement().apply {
                    execute("PRAGMA journal_mode=WAL;")
                    execute("PRAGMA foreign_keys=ON;")
                    close()
                }
            }
        )

        transaction {
            SchemaUtils.create(
                Users,
                Organizations,
                Accounts,
                Contacts,
                Invoices,
                InvoiceItems,
                JournalEntries,
                JournalLines,
                Products,
                Payments,
                BankAccounts,
                Warehouses,
                BankTransactions,
                TDSEntries,
                SyncQueue,
                AppSettings,
                AuditLogs,
            )

            // Safe migration: add columns that may not exist yet on existing databases
            val defaultTimestamp = LocalDateTime.now().toString()
            val migrationStatements = listOf(
                "ALTER TABLE accounts ADD COLUMN created_at TEXT DEFAULT '$defaultTimestamp'",
                "ALTER TABLE contacts ADD COLUMN created_at TEXT DEFAULT '$defaultTimestamp'",
                "ALTER TABLE invoices ADD COLUMN created_at TEXT DEFAULT '$defaultTimestamp'",
                "ALTER TABLE journal_entries ADD COLUMN created_at TEXT DEFAULT '$defaultTimestamp'",
                "ALTER TABLE payments ADD COLUMN created_at TEXT DEFAULT '$defaultTimestamp'",
                "ALTER TABLE products ADD COLUMN created_at TEXT DEFAULT '$defaultTimestamp'",
                "ALTER TABLE bank_accounts ADD COLUMN created_at TEXT DEFAULT '$defaultTimestamp'",
                "ALTER TABLE bank_transactions ADD COLUMN created_at TEXT DEFAULT '$defaultTimestamp'",
                "ALTER TABLE tds_entries ADD COLUMN created_at TEXT DEFAULT '$defaultTimestamp'",
                "ALTER TABLE warehouses ADD COLUMN created_at TEXT DEFAULT '$defaultTimestamp'",
            )
            for (statement in migrationStatements) {
                try {
                    exec(statement)
                } catch (_: Exception) {} // Column already exists
            }

            // Safe migration: add indexes that may not exist yet
            val indexStatements = listOf(
                "CREATE INDEX IF NOT EXISTS idx_accounts_org_id ON accounts(org_id)",
                "CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type)",
                "CREATE INDEX IF NOT EXISTS idx_accounts_parent_id ON accounts(parent_id)",
                "CREATE INDEX IF NOT EXISTS idx_contacts_org_id ON contacts(org_id)",
                "CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type)",
                "CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id)",
                "CREATE INDEX IF NOT EXISTS idx_invoices_contact_id ON invoices(contact_id)",
                "CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)",
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_org_invoice_number ON invoices(org_id, invoice_number)",
                "CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)",
                "CREATE INDEX IF NOT EXISTS idx_journal_entries_org_id ON journal_entries(org_id)",
                "CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(date)",
                "CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_id ON journal_lines(entry_id)",
                "CREATE INDEX IF NOT EXISTS idx_journal_lines_account_id ON journal_lines(account_id)",
                "CREATE INDEX IF NOT EXISTS idx_payments_org_id ON payments(org_id)",
                "CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id)",
                "CREATE INDEX IF NOT EXISTS idx_payments_contact_id ON payments(contact_id)",
                "CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(org_id)",
                "CREATE INDEX IF NOT EXISTS idx_bank_accounts_org_id ON bank_accounts(org_id)",
                "CREATE INDEX IF NOT EXISTS idx_bank_transactions_bank_account_id ON bank_transactions(bank_account_id)",
                "CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(date)",
                "CREATE INDEX IF NOT EXISTS idx_tds_entries_org_id ON tds_entries(org_id)",
                "CREATE INDEX IF NOT EXISTS idx_warehouses_org_id ON warehouses(org_id)",
            )
            for (statement in indexStatements) {
                try {
                    exec(statement)
                } catch (_: Exception) {} // Index already exists
            }

            // Fix legacy data: correct invoice type based on number prefix
            val typeFixStatements = listOf(
                "UPDATE invoices SET type = 'quotation' WHERE invoice_number LIKE 'QT-%' AND type = 'invoice'",
                "UPDATE invoices SET type = 'purchase_order' WHERE invoice_number LIKE 'PO-%' AND type = 'invoice'",
            )
            for (statement in typeFixStatements) {
                try { exec(statement) } catch (_: Exception) {}
            }

            // Ensure default organization exists (required for FK constraints on contacts/invoices)
            try {
                val hasDefaultOrg = Organizations.selectAll()
                    .where { Organizations.id eq "org-default" }
                    .count() > 0
                if (!hasDefaultOrg) {
                    Organizations.insert {
                        it[id] = "org-default"
                        it[name] = "My Organization"
                        it[updatedAt] = LocalDateTime.now()
                    }
                }
            } catch (e: Exception) {
                // Log but don't fail startup if default org seeding has issues
                System.err.println("Warning: Could not seed default organization: ${e.message}")
            }

            // Seed default chart of accounts if none exist for the default org
            try {
                val accountCount = Accounts.selectAll()
                    .where { Accounts.orgId eq "org-default" }
                    .count()
                if (accountCount == 0L) {
                    val defaultAccounts = listOf(
                        // Assets (1xxx)
                        Triple("1001", "Cash", "asset"),
                        Triple("1002", "Bank", "asset"),
                        Triple("1100", "Accounts Receivable", "asset"),
                        Triple("1200", "Inventory", "asset"),
                        // Liabilities (2xxx)
                        Triple("2001", "Accounts Payable", "liability"),
                        Triple("2100", "GST Payable", "liability"),
                        Triple("2200", "TDS Payable", "liability"),
                        // Equity (3xxx)
                        Triple("3001", "Owner's Equity", "equity"),
                        Triple("3100", "Retained Earnings", "equity"),
                        // Income (4xxx)
                        Triple("4001", "Sales Revenue", "income"),
                        Triple("4100", "Service Revenue", "income"),
                        Triple("4200", "Other Income", "income"),
                        // Expenses (5xxx)
                        Triple("5001", "Cost of Goods Sold", "expense"),
                        Triple("5100", "Salaries & Wages", "expense"),
                        Triple("5200", "Rent Expense", "expense"),
                        Triple("5300", "Utilities Expense", "expense"),
                        Triple("5400", "Office Supplies", "expense"),
                        Triple("5500", "Travel Expense", "expense"),
                        Triple("5600", "Marketing Expense", "expense"),
                        Triple("5900", "Miscellaneous Expense", "expense"),
                    )
                    for ((code, name, type) in defaultAccounts) {
                        Accounts.insert {
                            it[id] = "acc-$code"
                            it[orgId] = "org-default"
                            it[Accounts.code] = code
                            it[Accounts.name] = name
                            it[Accounts.type] = type
                            it[isGroup] = false
                            it[openingBalance] = java.math.BigDecimal.ZERO
                            it[currentBalance] = java.math.BigDecimal.ZERO
                            it[isActive] = true
                            it[updatedAt] = LocalDateTime.now()
                        }
                    }
                }
            } catch (e: Exception) {
                System.err.println("Warning: Could not seed default accounts: ${e.message}")
            }

            // Seed demo user if no users exist
            if (Users.selectAll().count() == 0L) {
                Users.insert {
                    it[name] = "Demo User"
                    it[email] = "demo@kontafy.com"
                    it[passwordHash] = UserRepository.hashPassword("demo123")
                    it[role] = "ADMIN"
                    it[organizationId] = "org-default"
                    it[licenseType] = "PROFESSIONAL"
                    it[licenseKey] = "KTF-PRO-DEMO-2026"
                    it[licenseExpiry] = "2026-12-31"
                    it[isActive] = true
                    it[createdAt] = LocalDateTime.now()
                    it[updatedAt] = LocalDateTime.now()
                }
            }
        }
    }

    fun <T> dbQuery(block: () -> T): T = transaction { block() }

    fun isInitialized(): Boolean = database != null
}
