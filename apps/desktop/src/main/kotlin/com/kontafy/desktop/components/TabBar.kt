package com.kontafy.desktop.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.theme.KontafyColors

data class TabItem(
    val label: String,
    val badge: String? = null,
)

@Composable
fun KontafyTabBar(
    tabs: List<TabItem>,
    selectedIndex: Int,
    onTabSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(KontafyColors.SurfaceElevated)
            .padding(horizontal = 24.dp),
        horizontalArrangement = Arrangement.spacedBy(0.dp),
    ) {
        tabs.forEachIndexed { index, tab ->
            val isSelected = index == selectedIndex
            Column(
                modifier = Modifier
                    .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                    .clickable { onTabSelected(index) }
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text(
                        text = tab.label,
                        style = MaterialTheme.typography.labelLarge,
                        color = if (isSelected) KontafyColors.Navy else KontafyColors.Muted,
                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                    )
                    tab.badge?.let { badge ->
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = if (isSelected) KontafyColors.Navy.copy(alpha = 0.1f) else KontafyColors.Surface,
                        ) {
                            Text(
                                text = badge,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (isSelected) KontafyColors.Navy else KontafyColors.Muted,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            )
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(2.dp)
                        .background(if (isSelected) KontafyColors.Navy else KontafyColors.SurfaceElevated)
                )
            }
        }
    }
}
