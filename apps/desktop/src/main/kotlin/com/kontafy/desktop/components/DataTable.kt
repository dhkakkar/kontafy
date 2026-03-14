package com.kontafy.desktop.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowDropDown
import androidx.compose.material.icons.outlined.ArrowDropUp
import androidx.compose.material.icons.outlined.ChevronLeft
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.theme.KontafyColors

data class TableColumn<T>(
    val header: String,
    val width: Dp? = null,
    val weight: Float? = null,
    val sortable: Boolean = false,
    val content: @Composable (T) -> Unit,
)

@Composable
fun <T> KontafyDataTable(
    columns: List<TableColumn<T>>,
    data: List<T>,
    modifier: Modifier = Modifier,
    onRowClick: ((T) -> Unit)? = null,
    currentPage: Int = 1,
    totalPages: Int = 1,
    onPageChange: ((Int) -> Unit)? = null,
    sortColumn: String? = null,
    sortAscending: Boolean = true,
    onSortChange: ((String) -> Unit)? = null,
    emptyStateTitle: String = "No data",
    emptyStateSubtitle: String = "Nothing to display",
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
        elevation = CardDefaults.cardElevation(1.dp),
    ) {
        Column {
            // Header row
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = KontafyColors.Surface,
                shape = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    columns.forEach { column ->
                        val columnModifier = when {
                            column.weight != null -> Modifier.weight(column.weight)
                            column.width != null -> Modifier.width(column.width)
                            else -> Modifier.weight(1f)
                        }

                        Row(
                            modifier = columnModifier.then(
                                if (column.sortable && onSortChange != null) {
                                    Modifier.clickable { onSortChange(column.header) }
                                } else Modifier
                            ),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                column.header,
                                style = MaterialTheme.typography.labelMedium,
                                color = KontafyColors.Muted,
                                fontWeight = FontWeight.SemiBold,
                            )
                            if (column.sortable && sortColumn == column.header) {
                                Icon(
                                    if (sortAscending) Icons.Outlined.ArrowDropUp else Icons.Outlined.ArrowDropDown,
                                    contentDescription = "Sort",
                                    tint = KontafyColors.Navy,
                                    modifier = Modifier.size(18.dp),
                                )
                            }
                        }
                    }
                }
            }

            HorizontalDivider(color = KontafyColors.Border)

            if (data.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(48.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(emptyStateTitle, style = MaterialTheme.typography.titleLarge, color = KontafyColors.Muted)
                        Spacer(Modifier.height(4.dp))
                        Text(emptyStateSubtitle, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.MutedLight)
                    }
                }
            } else {
                data.forEachIndexed { index, item ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .then(
                                if (onRowClick != null) Modifier.clickable { onRowClick(item) } else Modifier
                            )
                            .padding(horizontal = 20.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        columns.forEach { column ->
                            val columnModifier = when {
                                column.weight != null -> Modifier.weight(column.weight)
                                column.width != null -> Modifier.width(column.width)
                                else -> Modifier.weight(1f)
                            }
                            Box(modifier = columnModifier) {
                                column.content(item)
                            }
                        }
                    }
                    if (index < data.lastIndex) {
                        HorizontalDivider(color = KontafyColors.BorderLight, modifier = Modifier.padding(horizontal = 20.dp))
                    }
                }
            }

            // Pagination
            if (onPageChange != null && totalPages > 1) {
                HorizontalDivider(color = KontafyColors.Border)
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.End,
                ) {
                    Text(
                        "Page $currentPage of $totalPages",
                        style = MaterialTheme.typography.bodyMedium,
                        color = KontafyColors.Muted,
                    )
                    Spacer(Modifier.width(16.dp))
                    IconButton(
                        onClick = { onPageChange(currentPage - 1) },
                        enabled = currentPage > 1,
                        modifier = Modifier.size(32.dp),
                    ) {
                        Icon(Icons.Outlined.ChevronLeft, "Previous", tint = if (currentPage > 1) KontafyColors.Ink else KontafyColors.MutedLight)
                    }
                    Spacer(Modifier.width(4.dp))
                    IconButton(
                        onClick = { onPageChange(currentPage + 1) },
                        enabled = currentPage < totalPages,
                        modifier = Modifier.size(32.dp),
                    ) {
                        Icon(Icons.Outlined.ChevronRight, "Next", tint = if (currentPage < totalPages) KontafyColors.Ink else KontafyColors.MutedLight)
                    }
                }
            }
        }
    }
}
