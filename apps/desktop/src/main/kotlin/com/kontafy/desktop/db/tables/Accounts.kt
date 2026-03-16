package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object Accounts : Table("accounts") {
    val id = varchar("id", 64)
    val orgId = varchar("org_id", 64).references(Organizations.id)
    val code = varchar("code", 20).nullable()
    val name = varchar("name", 255)
    val type = varchar("type", 50) // asset, liability, equity, income, expense
    val parentId = varchar("parent_id", 64).nullable() // self FK
    val isGroup = bool("is_group").default(false)
    val openingBalance = decimal("opening_balance", 15, 2).default(java.math.BigDecimal.ZERO)
    val currentBalance = decimal("current_balance", 15, 2).default(java.math.BigDecimal.ZERO)
    val description = text("description").nullable()
    val isActive = bool("is_active").default(true)
    val createdAt = datetime("created_at").default(LocalDateTime.now())
    val syncedAt = datetime("synced_at").nullable()
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())

    override val primaryKey = PrimaryKey(id)

    init {
        index(isUnique = false, orgId)
        index(isUnique = false, type)
        index(isUnique = false, parentId)
    }
}
