package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.api.TDSEntryModel
import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.TDSEntries
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.time.LocalDateTime

class TDSEntryRepository {

    fun getByOrgId(orgId: String): List<TDSEntryModel> = dbQuery {
        TDSEntries.selectAll().where { TDSEntries.orgId eq orgId }
            .orderBy(TDSEntries.date to SortOrder.DESC)
            .map { it.toTDSEntryModel() }
    }

    fun create(model: TDSEntryModel): TDSEntryModel = dbQuery {
        TDSEntries.insert {
            it[id] = model.id
            it[orgId] = model.orgId
            it[section] = model.section
            it[deducteeName] = model.deducteeName
            it[pan] = model.pan
            it[amount] = model.amount
            it[tdsRate] = model.tdsRate
            it[tdsAmount] = model.tdsAmount
            it[status] = model.status
            it[date] = model.date
            it[syncedAt] = model.syncedAt
            it[updatedAt] = model.updatedAt ?: LocalDateTime.now()
        }
        model
    }

    fun upsert(model: TDSEntryModel): TDSEntryModel = dbQuery {
        val existing = TDSEntries.selectAll().where { TDSEntries.id eq model.id }.singleOrNull()
        if (existing != null) {
            TDSEntries.update({ TDSEntries.id eq model.id }) {
                it[section] = model.section
                it[deducteeName] = model.deducteeName
                it[pan] = model.pan
                it[amount] = model.amount
                it[tdsRate] = model.tdsRate
                it[tdsAmount] = model.tdsAmount
                it[status] = model.status
                it[date] = model.date
                it[syncedAt] = model.syncedAt
                it[updatedAt] = LocalDateTime.now()
            }
            model
        } else {
            create(model)
        }
    }

    private fun ResultRow.toTDSEntryModel() = TDSEntryModel(
        id = this[TDSEntries.id],
        orgId = this[TDSEntries.orgId],
        section = this[TDSEntries.section],
        deducteeName = this[TDSEntries.deducteeName],
        pan = this[TDSEntries.pan],
        amount = this[TDSEntries.amount],
        tdsRate = this[TDSEntries.tdsRate],
        tdsAmount = this[TDSEntries.tdsAmount],
        status = this[TDSEntries.status],
        date = this[TDSEntries.date],
        syncedAt = this[TDSEntries.syncedAt],
        updatedAt = this[TDSEntries.updatedAt],
    )
}
