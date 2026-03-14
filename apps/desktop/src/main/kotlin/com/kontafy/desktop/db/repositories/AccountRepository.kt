package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.api.AccountModel
import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.Accounts
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.like
import java.math.BigDecimal
import java.time.LocalDateTime

class AccountRepository {

    fun getAll(): List<AccountModel> = dbQuery {
        Accounts.selectAll().map { it.toAccountModel() }
    }

    fun getById(id: String): AccountModel? = dbQuery {
        Accounts.selectAll().where { Accounts.id eq id }
            .map { it.toAccountModel() }
            .singleOrNull()
    }

    fun getByOrgId(orgId: String): List<AccountModel> = dbQuery {
        Accounts.selectAll().where { Accounts.orgId eq orgId }
            .map { it.toAccountModel() }
    }

    fun create(model: AccountModel): AccountModel = dbQuery {
        Accounts.insert {
            it[id] = model.id
            it[orgId] = model.orgId
            it[code] = model.code
            it[name] = model.name
            it[type] = model.type
            it[parentId] = model.parentId
            it[isGroup] = model.isGroup
            it[openingBalance] = model.openingBalance
            it[currentBalance] = model.currentBalance
            it[description] = model.description
            it[isActive] = model.isActive
            it[syncedAt] = model.syncedAt
            it[updatedAt] = model.updatedAt ?: LocalDateTime.now()
        }
        model
    }

    fun update(model: AccountModel): Boolean = dbQuery {
        Accounts.update({ Accounts.id eq model.id }) {
            it[name] = model.name
            it[code] = model.code
            it[type] = model.type
            it[parentId] = model.parentId
            it[isGroup] = model.isGroup
            it[openingBalance] = model.openingBalance
            it[currentBalance] = model.currentBalance
            it[description] = model.description
            it[isActive] = model.isActive
            it[syncedAt] = model.syncedAt
            it[updatedAt] = LocalDateTime.now()
        } > 0
    }

    fun delete(id: String): Boolean = dbQuery {
        Accounts.deleteWhere { Accounts.id eq id } > 0
    }

    fun search(query: String): List<AccountModel> = dbQuery {
        Accounts.selectAll().where {
            (Accounts.name like "%$query%") or
                (Accounts.code like "%$query%")
        }.map { it.toAccountModel() }
    }

    fun getTree(orgId: String): List<AccountModel> = dbQuery {
        // Returns all accounts for an org; the tree structure is built by parentId references
        Accounts.selectAll().where { Accounts.orgId eq orgId }
            .orderBy(Accounts.code to SortOrder.ASC)
            .map { it.toAccountModel() }
    }

    fun getByType(orgId: String, type: String): List<AccountModel> = dbQuery {
        Accounts.selectAll().where {
            (Accounts.orgId eq orgId) and (Accounts.type eq type)
        }.map { it.toAccountModel() }
    }

    fun getBalance(id: String): BigDecimal = dbQuery {
        Accounts.select(Accounts.currentBalance).where { Accounts.id eq id }
            .map { it[Accounts.currentBalance] }
            .singleOrNull() ?: BigDecimal.ZERO
    }

    fun upsert(model: AccountModel): AccountModel = dbQuery {
        val existing = Accounts.selectAll().where { Accounts.id eq model.id }.singleOrNull()
        if (existing != null) {
            update(model)
            model
        } else {
            create(model)
        }
    }

    private fun ResultRow.toAccountModel() = AccountModel(
        id = this[Accounts.id],
        orgId = this[Accounts.orgId],
        code = this[Accounts.code],
        name = this[Accounts.name],
        type = this[Accounts.type],
        parentId = this[Accounts.parentId],
        isGroup = this[Accounts.isGroup],
        openingBalance = this[Accounts.openingBalance],
        currentBalance = this[Accounts.currentBalance],
        description = this[Accounts.description],
        isActive = this[Accounts.isActive],
        syncedAt = this[Accounts.syncedAt],
        updatedAt = this[Accounts.updatedAt],
    )
}
