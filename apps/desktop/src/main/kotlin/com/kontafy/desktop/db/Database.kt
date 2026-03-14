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
                SyncQueue,
                AppSettings,
            )

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
