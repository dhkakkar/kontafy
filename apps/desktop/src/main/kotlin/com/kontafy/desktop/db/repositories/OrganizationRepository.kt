package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.api.OrganizationModel
import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.Organizations
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.like
import java.time.LocalDateTime

class OrganizationRepository {

    fun getAll(): List<OrganizationModel> = dbQuery {
        Organizations.selectAll().map { it.toOrganizationModel() }
    }

    fun getById(id: String): OrganizationModel? = dbQuery {
        Organizations.selectAll().where { Organizations.id eq id }
            .map { it.toOrganizationModel() }
            .singleOrNull()
    }

    fun create(model: OrganizationModel): OrganizationModel = dbQuery {
        Organizations.insert {
            it[id] = model.id
            it[name] = model.name
            it[gstin] = model.gstin
            it[pan] = model.pan
            it[address] = model.address
            it[city] = model.city
            it[state] = model.state
            it[stateCode] = model.stateCode
            it[pincode] = model.pincode
            it[phone] = model.phone
            it[email] = model.email
            it[logo] = model.logo
            it[invoicePrefix] = model.invoicePrefix
            it[financialYearStart] = model.financialYearStart
            it[settings] = model.settings
            it[syncedAt] = model.syncedAt
            it[updatedAt] = model.updatedAt ?: LocalDateTime.now()
        }
        model
    }

    fun update(model: OrganizationModel): Boolean = dbQuery {
        Organizations.update({ Organizations.id eq model.id }) {
            it[name] = model.name
            it[gstin] = model.gstin
            it[pan] = model.pan
            it[address] = model.address
            it[city] = model.city
            it[state] = model.state
            it[stateCode] = model.stateCode
            it[pincode] = model.pincode
            it[phone] = model.phone
            it[email] = model.email
            it[logo] = model.logo
            it[invoicePrefix] = model.invoicePrefix
            it[financialYearStart] = model.financialYearStart
            it[settings] = model.settings
            it[syncedAt] = model.syncedAt
            it[updatedAt] = LocalDateTime.now()
        } > 0
    }

    fun delete(id: String): Boolean = dbQuery {
        Organizations.deleteWhere { Organizations.id eq id } > 0
    }

    fun search(query: String): List<OrganizationModel> = dbQuery {
        Organizations.selectAll().where {
            (Organizations.name like "%$query%") or
                (Organizations.gstin like "%$query%") or
                (Organizations.email like "%$query%")
        }.map { it.toOrganizationModel() }
    }

    fun getByOrgId(orgId: String): List<OrganizationModel> = dbQuery {
        Organizations.selectAll().where { Organizations.id eq orgId }
            .map { it.toOrganizationModel() }
    }

    fun upsert(model: OrganizationModel): OrganizationModel = dbQuery {
        val existing = Organizations.selectAll().where { Organizations.id eq model.id }.singleOrNull()
        if (existing != null) {
            update(model)
            model
        } else {
            create(model)
        }
    }

    private fun ResultRow.toOrganizationModel() = OrganizationModel(
        id = this[Organizations.id],
        name = this[Organizations.name],
        gstin = this[Organizations.gstin],
        pan = this[Organizations.pan],
        address = this[Organizations.address],
        city = this[Organizations.city],
        state = this[Organizations.state],
        stateCode = this[Organizations.stateCode],
        pincode = this[Organizations.pincode],
        phone = this[Organizations.phone],
        email = this[Organizations.email],
        logo = this[Organizations.logo],
        invoicePrefix = this[Organizations.invoicePrefix],
        financialYearStart = this[Organizations.financialYearStart],
        settings = this[Organizations.settings],
        syncedAt = this[Organizations.syncedAt],
        updatedAt = this[Organizations.updatedAt],
    )
}
