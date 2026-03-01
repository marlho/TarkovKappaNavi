export type Lang = 'ja' | 'en';

export interface Dictionary {
  // Navigation
  nav_dashboard: string;
  nav_tasks: string;
  nav_hideout: string;
  nav_items: string;
  nav_map: string;
  nav_settings: string;
  menu_close: string;
  menu_open: string;

  // Sidebar
  sidebar_kappa_progress: string;
  sidebar_traders: string;
  sidebar_preparing: string;
  sidebar_map_remaining: string;

  // Loading overlay
  loading_db: string;
  loading_api: string;
  loading_progress: string;

  // Common
  common_cancel: string;
  common_close: string;
  common_reset: string;
  common_loading: string;

  // UI
  modal_close: string;
  spinner_loading: string;

  // Status
  status_not_started: string;
  status_in_progress: string;
  status_done: string;

  // Task types
  type_shoot: string;
  type_giveItem: string;
  type_visit: string;
  type_findItem: string;
  type_plantItem: string;
  type_mark: string;
  type_extract: string;
  type_skill: string;
  type_traderLevel: string;
  type_experience: string;

  // Task filter
  filter_search_placeholder: string;
  filter_trader: string;
  filter_map: string;
  filter_type: string;
  filter_status: string;
  filter_kappa_only: string;
  filter_reset: string;

  // Task card
  taskcard_lock_level: string;
  taskcard_lock_prereq: string;

  // Task list
  tasklist_count: string;
  tasklist_empty: string;

  // View tabs
  view_flow: string;
  view_list: string;

  // Task flow
  flow_fullscreen: string;
  flow_exit_fullscreen: string;
  flow_fit: string;
  flow_empty: string;

  // Task detail
  detail_close: string;
  detail_objectives: string;
  detail_wiki: string;
  detail_wiki_ja: string;
  detail_prereqs: string;
  detail_prereqs_empty: string;
  detail_lock_level: string;
  detail_lock_prereq: string;
  detail_now_pin: string;
  detail_now_pin_hint: string;
  detail_now_pin_max: string;
  detail_pin: string;
  detail_unpin: string;
  detail_notes: string;

  // Progress actions
  progress_lock_level_hint: string;
  progress_lock_prereq_hint: string;
  progress_lock_level_click_hint: string;
  progress_level_modal_title: string;
  progress_level_modal_text: string;
  progress_level_change: string;
  progress_level_continue: string;
  progress_btn_start: string;
  progress_btn_done: string;
  progress_btn_reset: string;

  // Complete confirm modal
  complete_confirm_title: string;
  complete_confirm_desc: string;
  complete_bulk: string;
  complete_only_this: string;

  // Dashboard page
  dashboard_meta_title: string;
  dashboard_meta_desc: string;
  dashboard_page_title: string;
  kappa_progress_title: string;
  next_unlock_title: string;
  next_unlock_empty: string;

  // Tasks page
  tasks_meta_title: string;
  tasks_meta_desc: string;
  tasks_page_title: string;

  // Dashboard - Now panel
  now_pin_hint: string;
  now_unpin: string;
  now_not_started: string;
  now_more_objectives: string;

  // Dashboard - Recommended
  recommended_title: string;
  recommended_priority: string;
  recommended_by_map: string;
  recommended_empty: string;
  recommended_count: string;

  // Recommendations domain
  rec_kappa_downstream: string;
  rec_map_batch: string;
  rec_kappa_required: string;

  // Map
  map_meta_title: string;
  map_meta_desc: string;
  map_page_title: string;
  map_tasks_count: string;
  map_show_done: string;
  map_hide_done: string;
  map_no_tasks: string;
  map_fullscreen: string;
  map_exit_fullscreen: string;
  map_no_pins: string;
  map_pin_list: string;
  map_pin_add: string;
  map_pin_edit: string;
  map_pin_delete: string;
  map_pin_label_placeholder: string;
  map_pin_placing_hint: string;
  map_pin_section_user: string;
  map_pin_empty: string;
  map_pin_count: string;
  map_pin_opacity: string;
  map_pin_size: string;
  import_map_pins_count: string;
  map_info_toggle: string;
  map_pins_toggle: string;
  map_pin_show_labels: string;
  map_pin_shape: string;
  map_pin_shape_circle: string;
  map_pin_shape_diamond: string;
  map_pin_shape_square: string;
  map_pin_shape_triangle: string;
  map_pin_shape_star: string;
  map_pin_shape_marker: string;
  map_minimap: string;

  // Settings
  settings_meta_title: string;
  settings_meta_desc: string;
  settings_title: string;
  settings_player: string;
  settings_player_desc: string;
  settings_level: string;
  settings_level_hint: string;
  settings_wipe_id: string;
  settings_wipe_placeholder: string;
  settings_wipe_hint: string;
  settings_auto_start: string;
  settings_auto_start_desc: string;
  settings_lang: string;
  settings_lang_desc: string;
  settings_data: string;
  settings_data_desc: string;
  settings_qr: string;
  settings_qr_desc: string;
  settings_cache: string;
  settings_cache_desc: string;
  settings_show_welcome: string;
  settings_show_welcome_desc: string;
  settings_danger: string;
  settings_danger_desc: string;

  // Export/Import
  export_btn: string;
  import_btn: string;
  export_downloaded: string;
  export_failed: string;
  import_invalid_format: string;
  import_invalid_json: string;
  import_confirm_title: string;
  import_wipe_id: string;
  import_progress_count: string;
  import_notes_count: string;
  import_logs_count: string;
  import_hideout_count: string;
  import_overwrite_question: string;
  import_overwrite_btn: string;
  import_complete: string;
  import_save_failed: string;

  // Cache
  cache_not_fetched: string;
  cache_updated: string;
  cache_update_failed: string;
  cache_last_fetched: string;
  cache_updating: string;
  cache_update_btn: string;

  // Reset
  reset_btn: string;
  reset_complete: string;
  reset_failed: string;
  reset_confirm_title: string;
  reset_confirm_text: string;
  reset_confirm_hint: string;
  reset_placeholder: string;
  reset_confirm_word: string;
  reset_execute: string;

  // QR Share
  qr_generate: string;
  qr_no_profile: string;
  qr_too_large: string;
  qr_generate_failed: string;
  qr_tasks_hideout: string;
  qr_data_size: string;
  qr_size_warning: string;
  qr_split_notice: string;
  qr_split_instruction: string;
  qr_part1_title: string;
  qr_part2_title: string;
  qr_secondary_too_large: string;

  // Items
  items_meta_title: string;
  items_meta_desc: string;
  items_page_title: string;
  items_count: string;
  items_fetch_error: string;
  items_show_more: string;
  items_search_placeholder: string;
  items_view_tier: string;
  items_view_grid: string;
  items_tier_count: string;
  items_sort_pricePerSlot: string;
  items_sort_bestSellPrice: string;
  items_sort_name: string;
  items_task_usedInKappa: string;
  items_task_rewardFromTask: string;
  items_task_collector: string;
  items_reset: string;

  // Item type labels
  item_type_ammo: string;
  item_type_ammoBox: string;
  item_type_any: string;
  item_type_armor: string;
  item_type_armorPlate: string;
  item_type_backpack: string;
  item_type_barter: string;
  item_type_container: string;
  item_type_glasses: string;
  item_type_grenade: string;
  item_type_gun: string;
  item_type_headphones: string;
  item_type_helmet: string;
  item_type_injectors: string;
  item_type_keys: string;
  item_type_markedOnly: string;
  item_type_meds: string;
  item_type_mods: string;
  item_type_noFlea: string;
  item_type_pistolGrip: string;
  item_type_poster: string;
  item_type_preset: string;
  item_type_provisions: string;
  item_type_rig: string;
  item_type_specialSlot: string;
  item_type_suppressor: string;
  item_type_wearable: string;

  // Item source labels
  item_source_fleaMarket: string;
  item_source_therapist: string;
  item_source_ragman: string;
  item_source_jaeger: string;
  item_source_mechanic: string;
  item_source_peacekeeper: string;
  item_source_skier: string;
  item_source_prapor: string;
  item_source_fence: string;

  // Item detail modal
  item_detail_wiki: string;
  item_detail_tasks: string;
  item_detail_required_tasks: string;
  item_detail_reward_tasks: string;
  item_detail_crafts_barters: string;
  item_detail_craft_for: string;
  item_detail_craft_using: string;
  item_detail_barter_for: string;
  item_detail_barter_using: string;
  item_detail_buy_prices: string;
  item_detail_source: string;
  item_detail_currency: string;
  item_detail_price: string;
  item_detail_rub_price: string;
  item_detail_no_buy: string;
  item_detail_loading: string;
  item_detail_not_found: string;

  // Duration format
  duration_hm: string;
  duration_h: string;
  duration_m: string;

  // Hideout
  hideout_meta_title: string;
  hideout_meta_desc: string;
  hideout_page_title: string;
  hideout_built: string;
  hideout_buildable: string;
  hideout_locked: string;
  hideout_select_station: string;
  hideout_levels: string;
  hideout_level_n: string;
  hideout_build: string;
  hideout_undo: string;
  hideout_crafts_count: string;
  hideout_no_crafts: string;
  hideout_reward: string;
  hideout_materials: string;
  hideout_tab_list: string;
  hideout_tab_detail: string;
  hideout_tab_summary: string;
  hideout_summary_empty: string;
  hideout_summary_filter_buildable: string;
  hideout_summary_filter_buildable_tip: string;
  hideout_summary_filter_not_built: string;
  hideout_summary_filter_not_built_tip: string;
  hideout_summary_filter_all: string;
  hideout_summary_filter_all_tip: string;
  hideout_summary_compact: string;
  hideout_summary_compact_tip: string;
  hideout_next_items: string;
  hideout_summary_allocation_note: string;
  import_hideout_inventory_count: string;

  // Share import
  share_title: string;
  share_no_data: string;
  share_no_data_desc: string;
  share_go_dashboard: string;
  share_invalid_format: string;
  share_invalid_hideout: string;
  share_import_title: string;
  share_import_title_hideout: string;
  share_level: string;
  share_wipe_id: string;
  share_done_count: string;
  share_in_progress_count: string;
  share_pin_count: string;
  share_hideout_count: string;
  share_map_pins_count: string;
  share_overwrite_hideout_note: string;
  share_overwrite_note: string;
  share_import_btn: string;
  share_confirm_title: string;
  share_confirm_text: string;
  share_confirm_text_hideout: string;
  share_confirm_overwrite: string;
  share_import_complete: string;
  share_import_hideout_complete: string;
  share_import_failed: string;

  // Collector (used in ItemsPage regex matching)
  collector_name: string;

  // Onboarding
  onboarding_welcome_title: string;
  onboarding_welcome_desc: string;
  onboarding_welcome_lang: string;
  onboarding_level_title: string;
  onboarding_level_desc: string;
  onboarding_level_current: string;
  onboarding_guide_title: string;
  onboarding_guide_dashboard: string;
  onboarding_guide_dashboard_desc: string;
  onboarding_guide_tasks: string;
  onboarding_guide_tasks_desc: string;
  onboarding_guide_hideout: string;
  onboarding_guide_hideout_desc: string;
  onboarding_guide_items: string;
  onboarding_guide_items_desc: string;
  onboarding_guide_map: string;
  onboarding_guide_map_desc: string;
  onboarding_guide_settings: string;
  onboarding_guide_settings_desc: string;
  onboarding_ready_title: string;
  onboarding_ready_desc: string;
  onboarding_ready_privacy: string;
  onboarding_ready_export: string;
  onboarding_ready_qr: string;
  onboarding_ready_hint: string;
  onboarding_skip: string;
  onboarding_back: string;
  onboarding_next: string;
  onboarding_start: string;

  // Tier settings
  settings_tier: string;
  settings_tier_desc: string;
  tier_validation_error: string;
  tier_below_c: string;
  tier_reset: string;

  // Pin preset
  pin_preset_name_placeholder: string;
  pin_preset_generate: string;
  pin_preset_copied: string;
  pin_preset_copy: string;
  pin_preset_no_data: string;
  pin_preset_go_map: string;
  pin_preset_invalid: string;
  pin_preset_import_title: string;
  pin_preset_pin_count: string;
  pin_preset_add_note: string;
  pin_preset_importing: string;
  pin_preset_add_btn: string;
  pin_preset_list_title: string;
  pin_preset_save: string;
  pin_preset_save_done: string;
  pin_preset_apply: string;
  pin_preset_delete: string;
  pin_preset_empty: string;
  pin_preset_pins_short: string;
  pin_preset_remove: string;
  pin_preset_confirm_delete: string;
}
