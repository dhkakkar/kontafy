package com.kontafy.desktop.db.tables

import org.jetbrains.exposed.sql.Table

object AppSettings : Table("app_settings") {
    val key = varchar("key", 100)
    val value = text("value")

    override val primaryKey = PrimaryKey(key)
}
