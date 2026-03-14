package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.api.ProductModel
import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.Products
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.like
import java.time.LocalDateTime

class ProductRepository {

    fun getAll(): List<ProductModel> = dbQuery {
        Products.selectAll().map { it.toProductModel() }
    }

    fun getById(id: String): ProductModel? = dbQuery {
        Products.selectAll().where { Products.id eq id }
            .map { it.toProductModel() }
            .singleOrNull()
    }

    fun getByOrgId(orgId: String): List<ProductModel> = dbQuery {
        Products.selectAll().where { Products.orgId eq orgId }
            .map { it.toProductModel() }
    }

    fun create(model: ProductModel): ProductModel = dbQuery {
        Products.insert {
            it[id] = model.id
            it[orgId] = model.orgId
            it[name] = model.name
            it[type] = model.type
            it[hsnCode] = model.hsnCode
            it[sacCode] = model.sacCode
            it[unit] = model.unit
            it[sellingPrice] = model.sellingPrice
            it[purchasePrice] = model.purchasePrice
            it[taxRate] = model.taxRate
            it[description] = model.description
            it[sku] = model.sku
            it[stockQuantity] = model.stockQuantity
            it[reorderLevel] = model.reorderLevel
            it[isActive] = model.isActive
            it[syncedAt] = model.syncedAt
            it[updatedAt] = model.updatedAt ?: LocalDateTime.now()
        }
        model
    }

    fun update(model: ProductModel): Boolean = dbQuery {
        Products.update({ Products.id eq model.id }) {
            it[name] = model.name
            it[type] = model.type
            it[hsnCode] = model.hsnCode
            it[sacCode] = model.sacCode
            it[unit] = model.unit
            it[sellingPrice] = model.sellingPrice
            it[purchasePrice] = model.purchasePrice
            it[taxRate] = model.taxRate
            it[description] = model.description
            it[sku] = model.sku
            it[stockQuantity] = model.stockQuantity
            it[reorderLevel] = model.reorderLevel
            it[isActive] = model.isActive
            it[syncedAt] = model.syncedAt
            it[updatedAt] = LocalDateTime.now()
        } > 0
    }

    fun delete(id: String): Boolean = dbQuery {
        Products.deleteWhere { Products.id eq id } > 0
    }

    fun search(query: String): List<ProductModel> = dbQuery {
        Products.selectAll().where {
            (Products.name like "%$query%") or
                (Products.sku like "%$query%") or
                (Products.hsnCode like "%$query%")
        }.map { it.toProductModel() }
    }

    fun searchByOrgId(orgId: String, query: String): List<ProductModel> = dbQuery {
        Products.selectAll().where {
            (Products.orgId eq orgId) and (
                (Products.name like "%$query%") or
                    (Products.sku like "%$query%") or
                    (Products.hsnCode like "%$query%")
                )
        }.map { it.toProductModel() }
    }

    fun getByType(orgId: String, type: String): List<ProductModel> = dbQuery {
        Products.selectAll().where {
            (Products.orgId eq orgId) and (Products.type eq type)
        }.map { it.toProductModel() }
    }

    fun getLowStock(orgId: String): List<ProductModel> = dbQuery {
        Products.selectAll().where {
            (Products.orgId eq orgId) and
                (Products.isActive eq true) and
                (Products.type eq "goods")
        }.map { it.toProductModel() }
            .filter { it.stockQuantity <= it.reorderLevel }
    }

    fun upsert(model: ProductModel): ProductModel = dbQuery {
        val existing = Products.selectAll().where { Products.id eq model.id }.singleOrNull()
        if (existing != null) {
            update(model)
            model
        } else {
            create(model)
        }
    }

    private fun ResultRow.toProductModel() = ProductModel(
        id = this[Products.id],
        orgId = this[Products.orgId],
        name = this[Products.name],
        type = this[Products.type],
        hsnCode = this[Products.hsnCode],
        sacCode = this[Products.sacCode],
        unit = this[Products.unit],
        sellingPrice = this[Products.sellingPrice],
        purchasePrice = this[Products.purchasePrice],
        taxRate = this[Products.taxRate],
        description = this[Products.description],
        sku = this[Products.sku],
        stockQuantity = this[Products.stockQuantity],
        reorderLevel = this[Products.reorderLevel],
        isActive = this[Products.isActive],
        syncedAt = this[Products.syncedAt],
        updatedAt = this[Products.updatedAt],
    )
}
