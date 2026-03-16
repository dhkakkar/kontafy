package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.api.WarehouseModel
import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.Warehouses
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import java.time.LocalDateTime

class WarehouseRepository {

    fun getAll(): List<WarehouseModel> = dbQuery {
        Warehouses.selectAll().map { it.toWarehouseModel() }
    }

    fun getByOrgId(orgId: String): List<WarehouseModel> = dbQuery {
        Warehouses.selectAll().where { Warehouses.orgId eq orgId }
            .map { it.toWarehouseModel() }
    }

    fun getById(id: String): WarehouseModel? = dbQuery {
        Warehouses.selectAll().where { Warehouses.id eq id }
            .map { it.toWarehouseModel() }
            .singleOrNull()
    }

    fun create(model: WarehouseModel): WarehouseModel = dbQuery {
        Warehouses.insert {
            it[id] = model.id
            it[orgId] = model.orgId
            it[name] = model.name
            it[address] = model.address
            it[city] = model.city
            it[state] = model.state
            it[country] = model.country
            it[pincode] = model.pincode
            it[isActive] = model.isActive
            it[updatedAt] = LocalDateTime.now()
        }
        model
    }

    fun update(model: WarehouseModel): Boolean = dbQuery {
        Warehouses.update({ Warehouses.id eq model.id }) {
            it[name] = model.name
            it[address] = model.address
            it[city] = model.city
            it[state] = model.state
            it[country] = model.country
            it[pincode] = model.pincode
            it[isActive] = model.isActive
            it[updatedAt] = LocalDateTime.now()
        } > 0
    }

    fun delete(id: String): Boolean = dbQuery {
        Warehouses.deleteWhere { Warehouses.id eq id } > 0
    }

    fun upsert(model: WarehouseModel): WarehouseModel = dbQuery {
        val existing = Warehouses.selectAll().where { Warehouses.id eq model.id }.singleOrNull()
        if (existing != null) {
            update(model)
            model
        } else {
            create(model)
        }
    }

    private fun ResultRow.toWarehouseModel() = WarehouseModel(
        id = this[Warehouses.id],
        orgId = this[Warehouses.orgId],
        name = this[Warehouses.name],
        address = this[Warehouses.address],
        city = this[Warehouses.city],
        state = this[Warehouses.state],
        country = this[Warehouses.country],
        pincode = this[Warehouses.pincode],
        isActive = this[Warehouses.isActive],
    )
}
