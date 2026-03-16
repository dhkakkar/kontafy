package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object Products : Table("products") {
    val id = varchar("id", 64)
    val orgId = varchar("org_id", 64).references(Organizations.id)
    val name = varchar("name", 255)
    val type = varchar("type", 20) // goods, services
    val hsnCode = varchar("hsn_code", 20).nullable()
    val sacCode = varchar("sac_code", 20).nullable()
    val unit = varchar("unit", 20).nullable()
    val sellingPrice = decimal("selling_price", 15, 2).default(java.math.BigDecimal.ZERO)
    val purchasePrice = decimal("purchase_price", 15, 2).default(java.math.BigDecimal.ZERO)
    val taxRate = decimal("tax_rate", 5, 2).default(java.math.BigDecimal.ZERO)
    val description = text("description").nullable()
    val sku = varchar("sku", 50).nullable()
    val stockQuantity = decimal("stock_quantity", 15, 4).default(java.math.BigDecimal.ZERO)
    val reorderLevel = decimal("reorder_level", 15, 4).default(java.math.BigDecimal.ZERO)
    val isActive = bool("is_active").default(true)
    val createdAt = datetime("created_at").default(LocalDateTime.now())
    val syncedAt = datetime("synced_at").nullable()
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())

    override val primaryKey = PrimaryKey(id)

    init {
        index(isUnique = false, orgId)
    }
}
