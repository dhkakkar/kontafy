package com.kontafy.desktop.db.repositories

import com.kontafy.desktop.db.KontafyDatabase.dbQuery
import com.kontafy.desktop.db.tables.AppSettings
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq

class AppSettingsRepository {

    fun get(key: String): String? = dbQuery {
        AppSettings.selectAll().where { AppSettings.key eq key }
            .map { it[AppSettings.value] }
            .singleOrNull()
    }

    fun set(key: String, value: String) = dbQuery {
        val existing = AppSettings.selectAll().where { AppSettings.key eq key }.singleOrNull()
        if (existing != null) {
            AppSettings.update({ AppSettings.key eq key }) {
                it[AppSettings.value] = value
            }
        } else {
            AppSettings.insert {
                it[AppSettings.key] = key
                it[AppSettings.value] = value
            }
        }
    }

    fun remove(key: String): Boolean = dbQuery {
        AppSettings.deleteWhere { AppSettings.key eq key } > 0
    }

    fun getAll(): Map<String, String> = dbQuery {
        AppSettings.selectAll().associate {
            it[AppSettings.key] to it[AppSettings.value]
        }
    }
}
