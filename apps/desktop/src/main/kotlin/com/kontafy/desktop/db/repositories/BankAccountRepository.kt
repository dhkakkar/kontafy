package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.api.BankAccountModel
import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.BankAccounts
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.like
import java.time.LocalDateTime

class BankAccountRepository {

    fun getAll(): List<BankAccountModel> = dbQuery {
        BankAccounts.selectAll().map { it.toBankAccountModel() }
    }

    fun getById(id: String): BankAccountModel? = dbQuery {
        BankAccounts.selectAll().where { BankAccounts.id eq id }
            .map { it.toBankAccountModel() }
            .singleOrNull()
    }

    fun getByOrgId(orgId: String): List<BankAccountModel> = dbQuery {
        BankAccounts.selectAll().where { BankAccounts.orgId eq orgId }
            .map { it.toBankAccountModel() }
    }

    fun create(model: BankAccountModel): BankAccountModel = dbQuery {
        BankAccounts.insert {
            it[id] = model.id
            it[orgId] = model.orgId
            it[bankName] = model.bankName
            it[accountNumber] = model.accountNumber
            it[ifscCode] = model.ifscCode
            it[accountType] = model.accountType
            it[balance] = model.balance
            it[isActive] = model.isActive
            it[syncedAt] = model.syncedAt
            it[updatedAt] = model.updatedAt ?: LocalDateTime.now()
        }
        model
    }

    fun update(model: BankAccountModel): Boolean = dbQuery {
        BankAccounts.update({ BankAccounts.id eq model.id }) {
            it[bankName] = model.bankName
            it[accountNumber] = model.accountNumber
            it[ifscCode] = model.ifscCode
            it[accountType] = model.accountType
            it[balance] = model.balance
            it[isActive] = model.isActive
            it[syncedAt] = model.syncedAt
            it[updatedAt] = LocalDateTime.now()
        } > 0
    }

    fun delete(id: String): Boolean = dbQuery {
        BankAccounts.deleteWhere { BankAccounts.id eq id } > 0
    }

    fun search(query: String): List<BankAccountModel> = dbQuery {
        BankAccounts.selectAll().where {
            (BankAccounts.bankName like "%$query%") or
                (BankAccounts.accountNumber like "%$query%")
        }.map { it.toBankAccountModel() }
    }

    fun upsert(model: BankAccountModel): BankAccountModel = dbQuery {
        val existing = BankAccounts.selectAll().where { BankAccounts.id eq model.id }.singleOrNull()
        if (existing != null) {
            update(model)
            model
        } else {
            create(model)
        }
    }

    private fun ResultRow.toBankAccountModel() = BankAccountModel(
        id = this[BankAccounts.id],
        orgId = this[BankAccounts.orgId],
        bankName = this[BankAccounts.bankName],
        accountNumber = this[BankAccounts.accountNumber],
        ifscCode = this[BankAccounts.ifscCode],
        accountType = this[BankAccounts.accountType],
        balance = this[BankAccounts.balance],
        isActive = this[BankAccounts.isActive],
        syncedAt = this[BankAccounts.syncedAt],
        updatedAt = this[BankAccounts.updatedAt],
    )
}
