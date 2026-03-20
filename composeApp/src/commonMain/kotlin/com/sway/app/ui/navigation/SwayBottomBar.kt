package com.sway.app.ui.navigation

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.sway.app.ui.AppRoute
import com.sway.app.ui.design.BrandColors

@Composable
fun SwayBottomBar(currentRoute: AppRoute, onRouteSelected: (AppRoute) -> Unit) {
    NavigationBar(containerColor = BrandColors.Shell, tonalElevation = 0.dp) {
        val bottomBarRoutes = AppRoute.entries.filter { it != AppRoute.Notifications }
        bottomBarRoutes.forEach { item ->
            NavigationBarItem(
                selected = currentRoute == item,
                onClick = { onRouteSelected(item) },
                icon = {
                    val iconLabel = when (item) {
                        AppRoute.Round -> "[]"
                        AppRoute.Dates -> "<3"
                        AppRoute.Notifications -> "()"
                        AppRoute.Profile -> "O"
                    }
                    Text(iconLabel, style = MaterialTheme.typography.titleMedium)
                },
                label = { Text(item.label) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = BrandColors.Ink,
                    selectedTextColor = BrandColors.Ink,
                    indicatorColor = Color.Transparent,
                    unselectedIconColor = BrandColors.Muted,
                    unselectedTextColor = BrandColors.Muted,
                )
            )
        }
    }
}
