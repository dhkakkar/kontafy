package com.kontafy.desktop.shortcuts

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.kontafy.desktop.theme.KontafyColors

@Composable
fun ShortcutHelpDialog(
    onDismiss: () -> Unit,
) {
    val categories = KeyboardShortcuts.getShortcutReference()

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .width(700.dp)
                .heightIn(max = 600.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text(
                            "Keyboard Shortcuts",
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = KontafyColors.Ink,
                        )
                        Spacer(Modifier.height(2.dp))
                        Text(
                            "Tally-style shortcuts for fast navigation",
                            style = MaterialTheme.typography.bodySmall,
                            color = KontafyColors.Muted,
                        )
                    }
                    TextButton(onClick = onDismiss) {
                        Text("Close", color = KontafyColors.Muted)
                    }
                }

                Spacer(Modifier.height(16.dp))

                HorizontalDivider(color = KontafyColors.Border)

                Spacer(Modifier.height(16.dp))

                // Shortcuts grid
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(20.dp),
                ) {
                    // Display in 2-column layout
                    val leftCategories = categories.take(3)
                    val rightCategories = categories.drop(3)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(24.dp),
                    ) {
                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(20.dp),
                        ) {
                            leftCategories.forEach { category ->
                                ShortcutCategorySection(category)
                            }
                        }
                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(20.dp),
                        ) {
                            rightCategories.forEach { category ->
                                ShortcutCategorySection(category)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ShortcutCategorySection(category: ShortcutCategory) {
    Column {
        Text(
            category.name,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = KontafyColors.Green,
        )
        Spacer(Modifier.height(8.dp))

        category.shortcuts.forEach { shortcut ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 3.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Key badge
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = KontafyColors.Navy.copy(alpha = 0.08f),
                ) {
                    Text(
                        shortcut.keys,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        style = MaterialTheme.typography.labelSmall,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.SemiBold,
                        color = KontafyColors.Navy,
                        fontSize = 11.sp,
                    )
                }
                Spacer(Modifier.width(8.dp))
                Text(
                    shortcut.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = KontafyColors.Ink,
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}
