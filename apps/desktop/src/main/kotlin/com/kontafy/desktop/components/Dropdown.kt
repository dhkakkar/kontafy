package com.kontafy.desktop.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.ArrowDropDown
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Popup
import com.kontafy.desktop.theme.KontafyColors

data class DropdownItem<T>(
    val value: T,
    val label: String,
    val subtitle: String? = null,
)

@Composable
fun <T> KontafyDropdown(
    items: List<DropdownItem<T>>,
    selectedItem: DropdownItem<T>?,
    onItemSelected: (DropdownItem<T>) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String = "Select...",
    searchable: Boolean = false,
    showCreateNew: Boolean = false,
    createNewLabel: String = "Create new",
    onCreateNew: (() -> Unit)? = null,
    isError: Boolean = false,
    errorMessage: String? = null,
    enabled: Boolean = true,
) {
    var expanded by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }

    val filteredItems = if (searchable && searchQuery.isNotBlank()) {
        items.filter {
            it.label.contains(searchQuery, ignoreCase = true) ||
                (it.subtitle?.contains(searchQuery, ignoreCase = true) == true)
        }
    } else {
        items
    }

    Column(modifier = modifier) {
        if (label != null) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
                color = if (isError) KontafyColors.Error else KontafyColors.Ink,
                modifier = Modifier.padding(bottom = 6.dp),
            )
        }

        Box {
            OutlinedTextField(
                value = selectedItem?.label ?: "",
                onValueChange = {},
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text(placeholder, color = KontafyColors.MutedLight) },
                readOnly = true,
                enabled = false,
                isError = isError,
                singleLine = true,
                trailingIcon = {
                    Icon(Icons.Outlined.ArrowDropDown, "Expand", tint = KontafyColors.Muted, modifier = Modifier.size(20.dp))
                },
                shape = RoundedCornerShape(8.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = KontafyColors.Navy,
                    unfocusedBorderColor = KontafyColors.Border,
                    cursorColor = KontafyColors.Navy,
                    focusedContainerColor = KontafyColors.White,
                    unfocusedContainerColor = KontafyColors.White,
                    disabledTextColor = KontafyColors.Ink,
                    disabledBorderColor = if (isError) KontafyColors.Error else KontafyColors.Border,
                    disabledContainerColor = if (enabled) KontafyColors.White else KontafyColors.Surface,
                    disabledPlaceholderColor = KontafyColors.MutedLight,
                    disabledTrailingIconColor = KontafyColors.Muted,
                    errorBorderColor = KontafyColors.Error,
                ),
                textStyle = MaterialTheme.typography.bodyLarge.copy(color = KontafyColors.Ink),
            )

            // Transparent overlay to capture clicks on the entire dropdown area
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .clip(RoundedCornerShape(8.dp))
                    .clickable(enabled = enabled) { expanded = !expanded },
            )

            DropdownMenu(
                expanded = expanded,
                onDismissRequest = {
                    expanded = false
                    searchQuery = ""
                },
                modifier = Modifier
                    .widthIn(min = 250.dp, max = 400.dp)
                    .heightIn(max = 320.dp),
            ) {
                if (searchable) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 4.dp),
                        placeholder = { Text("Search...", color = KontafyColors.MutedLight) },
                        leadingIcon = {
                            Icon(Icons.Outlined.Search, "Search", tint = KontafyColors.Muted, modifier = Modifier.size(16.dp))
                        },
                        singleLine = true,
                        shape = RoundedCornerShape(6.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = KontafyColors.Navy,
                            unfocusedBorderColor = KontafyColors.Border,
                            focusedContainerColor = KontafyColors.Surface,
                            unfocusedContainerColor = KontafyColors.Surface,
                        ),
                        textStyle = MaterialTheme.typography.bodySmall,
                    )
                    Spacer(Modifier.height(4.dp))
                }

                filteredItems.forEach { item ->
                    DropdownMenuItem(
                        text = {
                            Column {
                                Text(
                                    item.label,
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = KontafyColors.Ink,
                                    fontWeight = if (item == selectedItem) FontWeight.SemiBold else FontWeight.Normal,
                                )
                                item.subtitle?.let { sub ->
                                    Text(sub, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted)
                                }
                            }
                        },
                        onClick = {
                            onItemSelected(item)
                            expanded = false
                            searchQuery = ""
                        },
                        modifier = Modifier
                            .background(
                                if (item == selectedItem) KontafyColors.Navy.copy(alpha = 0.06f) else KontafyColors.SurfaceElevated
                            ),
                    )
                }

                if (filteredItems.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("No results found", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted)
                    }
                }

                if (showCreateNew && onCreateNew != null) {
                    HorizontalDivider(color = KontafyColors.BorderLight)
                    DropdownMenuItem(
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Outlined.Add, "Add", tint = KontafyColors.Navy, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    createNewLabel,
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = KontafyColors.Navy,
                                    fontWeight = FontWeight.Medium,
                                )
                            }
                        },
                        onClick = {
                            onCreateNew()
                            expanded = false
                            searchQuery = ""
                        },
                    )
                }
            }
        }

        if (isError && errorMessage != null) {
            Text(
                text = errorMessage,
                style = MaterialTheme.typography.bodySmall,
                color = KontafyColors.Error,
                modifier = Modifier.padding(top = 4.dp, start = 4.dp),
            )
        }
    }
}
