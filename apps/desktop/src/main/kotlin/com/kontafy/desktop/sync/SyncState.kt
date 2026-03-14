package com.kontafy.desktop.sync

import java.time.LocalDateTime

enum class SyncStatus {
    IDLE,
    SYNCING,
    ERROR,
    OFFLINE,
}

data class SyncState(
    val status: SyncStatus = SyncStatus.IDLE,
    val lastSyncTime: LocalDateTime? = null,
    val pendingChanges: Long = 0,
    val errorMessage: String? = null,
)
