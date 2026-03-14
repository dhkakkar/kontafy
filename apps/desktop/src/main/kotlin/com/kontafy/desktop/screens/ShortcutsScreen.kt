package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Keyboard
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kontafy.desktop.shortcuts.KeyboardShortcuts
import com.kontafy.desktop.theme.KontafyColors

@Composable
fun ShortcutsScreen() {
    val categories = KeyboardShortcuts.getShortcutReference()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(KontafyColors.Surface)
            .padding(32.dp),
    ) {
        // Header
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Icon(
                Icons.Outlined.Keyboard,
                contentDescription = null,
                tint = KontafyColors.Green,
                modifier = Modifier.size(28.dp),
            )
            Spacer(Modifier.width(12.dp))
            Column {
                Text(
                    "Keyboard Shortcuts",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = KontafyColors.Ink,
                )
                Text(
                    "Tally-style shortcuts for fast accounting workflow. Press Alt+G anywhere to open quick reference.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = KontafyColors.Muted,
                )
            }
        }

        Spacer(Modifier.height(24.dp))

        // Shortcut categories in grid
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Row of 3 cards
            categories.chunked(3).forEach { rowCategories ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    rowCategories.forEach { category ->
                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                // Category header
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = KontafyColors.Green.copy(alpha = 0.1f),
                                ) {
                                    Text(
                                        category.name,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = KontafyColors.Green,
                                    )
                                }

                                Spacer(Modifier.height(14.dp))

                                // Shortcut rows
                                category.shortcuts.forEach { shortcut ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 4.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        // Description
                                        Text(
                                            shortcut.description,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = KontafyColors.Ink,
                                            modifier = Modifier.weight(1f),
                                        )
                                        Spacer(Modifier.width(8.dp))
                                        // Key badges
                                        Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                            shortcut.keys.split("+").forEach { key ->
                                                Surface(
                                                    shape = RoundedCornerShape(4.dp),
                                                    color = KontafyColors.Navy.copy(alpha = 0.08f),
                                                    shadowElevation = 1.dp,
                                                ) {
                                                    Text(
                                                        key.trim(),
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                                        style = MaterialTheme.typography.labelSmall,
                                                        fontFamily = FontFamily.Monospace,
                                                        fontWeight = FontWeight.SemiBold,
                                                        color = KontafyColors.Navy,
                                                        fontSize = 10.sp,
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // Fill empty slots if row has < 3 items
                    repeat(3 - rowCategories.size) {
                        Spacer(Modifier.weight(1f))
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            // Tip card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = KontafyColors.Green.copy(alpha = 0.06f)),
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Outlined.Keyboard,
                        contentDescription = null,
                        tint = KontafyColors.Green,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text(
                            "Pro Tip",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = KontafyColors.Green,
                        )
                        Text(
                            "Use F-keys (F4\u2013F9) for quick voucher entry just like Tally. Press Alt+G anytime to see the shortcut quick reference overlay.",
                            style = MaterialTheme.typography.bodySmall,
                            color = KontafyColors.Muted,
                        )
                    }
                }
            }
        }
    }
}
