package com.kontafy.desktop.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.theme.KontafyColors

@Composable
fun TopBar(
    title: String,
    modifier: Modifier = Modifier,
    showSearch: Boolean = false,
    searchQuery: String = "",
    onSearchChange: (String) -> Unit = {},
    actions: @Composable RowScope.() -> Unit = {},
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = KontafyColors.SurfaceElevated,
        shadowElevation = 1.dp,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.headlineMedium,
                color = KontafyColors.Ink,
            )

            Spacer(Modifier.weight(1f))

            if (showSearch) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = onSearchChange,
                    modifier = Modifier.width(280.dp),
                    placeholder = { Text("Search...", color = KontafyColors.MutedLight, style = MaterialTheme.typography.bodyMedium) },
                    leadingIcon = {
                        Icon(
                            Icons.Outlined.Search,
                            contentDescription = "Search",
                            tint = KontafyColors.Muted,
                            modifier = Modifier.size(18.dp),
                        )
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = KontafyColors.Navy,
                        unfocusedBorderColor = KontafyColors.Border,
                        focusedContainerColor = KontafyColors.Surface,
                        unfocusedContainerColor = KontafyColors.Surface,
                    ),
                    textStyle = MaterialTheme.typography.bodyMedium,
                )
                Spacer(Modifier.width(12.dp))
            }

            actions()
        }
    }
}
