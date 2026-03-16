package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.SyncHistoryEntry
import com.kontafy.desktop.api.SyncStatusDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun SyncStatusScreen(
    apiClient: ApiClient,
) {
    var syncStatus by remember {
        mutableStateOf(
            SyncStatusDto(
                state = "OFFLINE",
                pendingChanges = 0,
            )
        )
    }
    var isLoading by remember { mutableStateOf(true) }
    var isSyncing by remember { mutableStateOf(false) }
    var isTestingConnection by remember { mutableStateOf(false) }
    var connectionLatency by remember { mutableStateOf<Long?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val result = apiClient.getSyncStatus()
        result.onSuccess { syncStatus = it }
        isLoading = false
    }

    fun triggerSync() {
        isSyncing = true
        scope.launch {
            syncStatus = syncStatus.copy(state = "SYNCING")
            delay(2000) // Simulate sync
            val result = apiClient.triggerSync()
            result.fold(
                onSuccess = { syncStatus = it },
                onFailure = {
                    syncStatus = syncStatus.copy(
                        state = "OFFLINE",
                    )
                },
            )
            isSyncing = false
        }
    }

    fun testConnection() {
        isTestingConnection = true
        scope.launch {
            val start = System.currentTimeMillis()
            val result = apiClient.getSyncStatus()
            val elapsed = System.currentTimeMillis() - start
            result.fold(
                onSuccess = { connectionLatency = elapsed },
                onFailure = { connectionLatency = -1 },
            )
            isTestingConnection = false
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Sync Status",
            actions = {
                KontafyButton(
                    text = "Test Connection",
                    onClick = ::testConnection,
                    variant = ButtonVariant.Outline,
                    isLoading = isTestingConnection,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = if (isSyncing) "Syncing..." else "Sync Now",
                    onClick = ::triggerSync,
                    variant = ButtonVariant.Primary,
                    isLoading = isSyncing,
                )
            },
        )

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                // Status cards row
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        // Connection status
                        val statusIcon = when (syncStatus.state) {
                            "ONLINE" -> Icons.Outlined.CloudDone
                            "SYNCING" -> Icons.Outlined.Sync
                            else -> Icons.Outlined.CloudOff
                        }
                        val statusBg = when (syncStatus.state) {
                            "ONLINE" -> Color(0xFFD1FAE5)
                            "SYNCING" -> Color(0xFFDBEAFE)
                            else -> Color(0xFFFEE2E2)
                        }
                        val statusTint = when (syncStatus.state) {
                            "ONLINE" -> KontafyColors.Green
                            "SYNCING" -> KontafyColors.StatusSent
                            else -> KontafyColors.StatusOverdue
                        }
                        val statusLabel = when (syncStatus.state) {
                            "ONLINE" -> "Online"
                            "SYNCING" -> "Syncing"
                            else -> "Offline"
                        }
                        StatCard(
                            title = "Connection",
                            value = statusLabel,
                            icon = statusIcon,
                            iconBackground = statusBg,
                            iconTint = statusTint,
                            modifier = Modifier.weight(1f),
                        )

                        StatCard(
                            title = "Last Sync",
                            value = syncStatus.lastSyncTime?.takeLast(8) ?: "Never",
                            icon = Icons.Outlined.Schedule,
                            iconBackground = Color(0xFFDBEAFE),
                            iconTint = KontafyColors.StatusSent,
                            modifier = Modifier.weight(1f),
                            subtitle = syncStatus.lastSyncTime?.take(10),
                        )

                        StatCard(
                            title = "Pending Changes",
                            value = syncStatus.pendingChanges.toString(),
                            icon = Icons.Outlined.Pending,
                            iconBackground = if (syncStatus.pendingChanges > 0) Color(0xFFFEF3C7) else Color(0xFFD1FAE5),
                            iconTint = if (syncStatus.pendingChanges > 0) KontafyColors.Warning else KontafyColors.Green,
                            modifier = Modifier.weight(1f),
                            subtitle = "items to sync",
                        )
                    }
                }

                // Connection test result
                connectionLatency?.let { latency ->
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (latency >= 0) Color(0xFFD1FAE5) else Color(0xFFFEE2E2)
                            ),
                        ) {
                            Row(
                                modifier = Modifier.padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon(
                                    if (latency >= 0) Icons.Outlined.CheckCircle else Icons.Outlined.Error,
                                    contentDescription = null,
                                    tint = if (latency >= 0) KontafyColors.Green else KontafyColors.StatusOverdue,
                                )
                                Spacer(Modifier.width(12.dp))
                                if (latency >= 0) {
                                    Text(
                                        "Connection successful - Latency: ${latency}ms",
                                        style = MaterialTheme.typography.bodyLarge,
                                        color = KontafyColors.GreenDark,
                                        fontWeight = FontWeight.Medium,
                                    )
                                } else {
                                    Text(
                                        "Connection failed - Server unreachable",
                                        style = MaterialTheme.typography.bodyLarge,
                                        color = KontafyColors.StatusOverdue,
                                        fontWeight = FontWeight.Medium,
                                    )
                                }
                            }
                        }
                    }
                }

                // Pending changes breakdown
                if (syncStatus.pendingByEntity.isNotEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                            elevation = CardDefaults.cardElevation(1.dp),
                        ) {
                            Column(modifier = Modifier.padding(24.dp)) {
                                Text(
                                    "Pending Changes by Entity",
                                    style = MaterialTheme.typography.titleLarge,
                                    color = KontafyColors.Ink,
                                )
                                Spacer(Modifier.height(16.dp))
                                syncStatus.pendingByEntity.forEach { (entity, count) ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            entity,
                                            style = MaterialTheme.typography.bodyLarge,
                                            color = KontafyColors.Ink,
                                        )
                                        KontafyBadge(
                                            text = count.toString(),
                                            type = BadgeType.Warning,
                                        )
                                    }
                                    HorizontalDivider(color = KontafyColors.BorderLight)
                                }
                            }
                        }
                    }
                }

                // Sync progress bar (when syncing)
                if (isSyncing) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                            elevation = CardDefaults.cardElevation(1.dp),
                        ) {
                            Column(modifier = Modifier.padding(24.dp)) {
                                Text(
                                    "Syncing in progress...",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = KontafyColors.Ink,
                                )
                                Spacer(Modifier.height(12.dp))
                                LinearProgressIndicator(
                                    modifier = Modifier.fillMaxWidth(),
                                    color = KontafyColors.Navy,
                                    trackColor = KontafyColors.Border,
                                )
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    "Uploading local changes and downloading updates...",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = KontafyColors.Muted,
                                )
                            }
                        }
                    }
                }

                // Sync history
                item {
                    Text(
                        "Recent Sync History",
                        style = MaterialTheme.typography.titleLarge,
                        color = KontafyColors.Ink,
                    )
                }

                item {
                    val historyColumns = listOf(
                        TableColumn<SyncHistoryEntry>(
                            header = "Timestamp",
                            width = 180.dp,
                            content = { entry ->
                                Text(entry.timestamp, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink)
                            },
                        ),
                        TableColumn<SyncHistoryEntry>(
                            header = "Action",
                            width = 80.dp,
                            content = { entry ->
                                KontafyBadge(
                                    text = entry.action,
                                    type = if (entry.action == "Push") BadgeType.Info else BadgeType.Neutral,
                                )
                            },
                        ),
                        TableColumn<SyncHistoryEntry>(
                            header = "Entities",
                            width = 80.dp,
                            content = { entry ->
                                Text(
                                    entry.entityCount.toString(),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = KontafyColors.Ink,
                                )
                            },
                        ),
                        TableColumn<SyncHistoryEntry>(
                            header = "Status",
                            width = 90.dp,
                            content = { entry ->
                                KontafyBadge(
                                    text = entry.status.replaceFirstChar { it.titlecase() },
                                    type = if (entry.status == "SUCCESS") BadgeType.Success else BadgeType.Error,
                                )
                            },
                        ),
                        TableColumn<SyncHistoryEntry>(
                            header = "Error",
                            weight = 1f,
                            content = { entry ->
                                Text(
                                    entry.errorMessage ?: "-",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = if (entry.errorMessage != null) KontafyColors.StatusOverdue else KontafyColors.Muted,
                                )
                            },
                        ),
                    )

                    KontafyDataTable(
                        columns = historyColumns,
                        data = syncStatus.recentHistory,
                        emptyStateTitle = "No sync history",
                        emptyStateSubtitle = "Sync operations will appear here",
                    )
                }
            }
        }
    }
}
