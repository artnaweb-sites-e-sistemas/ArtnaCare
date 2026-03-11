<?php
/**
 * Plugin Name: ArtnaCare Updates
 * Description: Expõe um endpoint REST para o ArtnaCare obter a quantidade de plugins e temas desatualizados. Requer autenticação (Application Password).
 * Version: 1.0.0
 * Author: ArtnaCare
 */

defined('ABSPATH') || exit;

add_action('rest_api_init', function () {
    register_rest_route('artnacare/v1', '/updates', [
        'methods'             => 'GET',
        'permission_callback' => function () {
            return current_user_can('update_plugins');
        },
        'callback'            => function () {
            $update_data = wp_get_update_data();
            $counts      = isset($update_data['counts']) ? $update_data['counts'] : [];
            return [
                'plugins_outdated' => isset($counts['plugins']) ? (int) $counts['plugins'] : 0,
                'themes_outdated'  => isset($counts['themes']) ? (int) $counts['themes'] : 0,
            ];
        },
    ]);
});
