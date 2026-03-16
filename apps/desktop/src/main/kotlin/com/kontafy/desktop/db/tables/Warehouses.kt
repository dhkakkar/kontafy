package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime
import java.time.LocalDateTime

object Warehouses : Table("warehouses") {
    val id = varchar("id", 64)
    val orgId = varchar("org_id", 64).references(Organizations.id)
    val name = varchar("name", 255)
    val address = varchar("address", 500).nullable()
    val city = varchar("city", 100).nullable()
    val state = varchar("state", 100).nullable()
    val country = varchar("country", 100).nullable()
    val pincode = varchar("pincode", 10).nullable()
    val isActive = bool("is_active").default(true)
    val createdAt = datetime("created_at").default(LocalDateTime.now())
    val updatedAt = datetime("updated_at").default(LocalDateTime.now())

    override val primaryKey = PrimaryKey(id)

    init {
        index(isUnique = false, orgId)
    }
}
