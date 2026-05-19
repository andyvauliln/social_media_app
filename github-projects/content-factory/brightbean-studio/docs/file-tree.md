# File Tree — brightbeanxyz/brightbean-studio

```text
./
├── .claude/
│   └── launch.json
├── .github/
│   ├── assets/
│   │   ├── BrightBean Social Media Platforms.webp
│   │   ├── BrightBean Studio Calendar.webp
│   │   ├── BrightBean Studio Idea Kanban Board.webp
│   │   ├── BrightBean Studio Post Editor.webp
│   │   └── brightbean-studio-logo.webp
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   ├── config.yml
│   │   └── feature_request.yml
│   ├── workflows/
│   │   └── ci.yml
│   ├── CODEOWNERS
│   └── pull_request_template.md
├── apps/
│   ├── accounts/
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   ├── 0001_initial.py
│   │   │   ├── 0002_replace_avatar_url_with_avatar.py
│   │   │   ├── 0003_add_tos_accepted_at.py
│   │   │   └── 0004_set_site_brightbean.py
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   └── test_adapters.py
│   │   ├── __init__.py
│   │   ├── adapters.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── middleware.py
│   │   ├── models.py
│   │   ├── signals.py
│   │   ├── urls_root.py
│   │   ├── urls.py
│   │   ├── views_signup.py
│   │   └── views.py
│   ├── approvals/
│   │   ├── management/
│   │   │   ├── commands/
│   │   │   │   ├── __init__.py
│   │   │   │   └── run_approval_reminders.py
│   │   │   └── __init__.py
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   ├── 0001_initial.py
│   │   │   └── 0002_approvalaction_platform_post.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── comments.py
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── tasks.py
│   │   ├── tests_security.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── calendar/
│   │   ├── data/
│   │   │   └── holidays.json
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   ├── 0001_initial.py
│   │   │   ├── 0002_initial.py
│   │   │   ├── 0003_queue_queueentry_recurrencerule_customcalendarevent.py
│   │   │   ├── 0004_queue_category_queue_social_account_queue_workspace_and_more.py
│   │   │   └── 0005_alter_customcalendarevent_color.py
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── holidays.py
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── tasks.py
│   │   ├── tests_security.py
│   │   ├── tests.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── client_portal/
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   └── 0001_initial.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── decorators.py
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── tests.py
│   │   ├── urls_admin.py
│   │   ├── urls.py
│   │   ├── views_admin.py
│   │   └── views.py
│   ├── common/
│   │   ├── templatetags/
│   │   │   ├── __init__.py
│   │   │   └── common_extras.py
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   └── test_validators.py
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── context_processors.py
│   │   ├── encryption.py
│   │   ├── managers.py
│   │   └── validators.py
│   ├── composer/
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   ├── 0001_initial.py
│   │   │   ├── 0002_initial.py
│   │   │   ├── 0003_idea.py
│   │   │   ├── 0004_contentcategory_post_category_csvimportjob_and_more.py
│   │   │   ├── 0005_add_idea_group.py
│   │   │   ├── 0006_populate_default_idea_groups.py
│   │   │   ├── 0007_platformpost_platform_specific_title_post_title.py
│   │   │   ├── 0008_add_tag_model.py
│   │   │   ├── 0009_populate_tags_from_json.py
│   │   │   ├── 0010_add_feed_model.py
│   │   │   ├── 0011_add_media_asset_to_idea.py
│   │   │   ├── 0012_add_ideamedia_model.py
│   │   │   ├── 0013_add_platform_post_scheduled_at.py
│   │   │   ├── 0014_add_platform_post_platform_extra.py
│   │   │   ├── 0015_per_account_status.py
│   │   │   └── 0016_alter_contentcategory_color.py
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_csv_upload_size.py
│   │   │   ├── test_idea_media_flows.py
│   │   │   ├── test_rss_url_validation.py
│   │   │   └── test_save_post_tags.py
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── builtin_templates.py
│   │   ├── curated_feeds.py
│   │   ├── forms.py
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── status.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── credentials/
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   ├── 0001_initial.py
│   │   │   ├── 0002_split_linkedin.py
│   │   │   ├── 0003_add_instagram_personal_platform.py
│   │   │   └── 0004_rename_instagram_personal_to_login.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── inbox/
│   │   ├── management/
│   │   │   ├── commands/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── backfill_inbox.py
│   │   │   │   └── run_inbox_sync.py
│   │   │   └── __init__.py
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   └── 0001_initial.py
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   └── test_webhooks.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── forms.py
│   │   ├── models.py
│   │   ├── sentiment.py
│   │   ├── tasks.py
│   │   ├── urls.py
│   │   ├── views.py
│   │   ├── webhook_urls.py
│   │   └── webhooks.py
│   ├── media_library/
│   │   ├── management/
│   │   │   ├── commands/
│   │   │   │   ├── __init__.py
│   │   │   │   └── cleanup_orphaned_media.py
│   │   │   └── __init__.py
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   ├── 0001_initial.py
│   │   │   └── 0002_mediaasset_is_starred_mediaasset_organization_and_more.py
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_models_and_filters.py
│   │   │   ├── test_security.py
│   │   │   └── test_tag_endpoints.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── managers.py
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── tasks.py
│   │   ├── urls_org.py
│   │   ├── urls.py
│   │   ├── validators.py
│   │   └── views.py
│   ├── members/
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   ├── 0001_initial.py
│   │   │   └── 0002_invitation_org_role.py
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   └── test_role_hierarchy.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── decorators.py
│   │   ├── middleware.py
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── notifications/
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   ├── 0001_initial.py
│   │   │   ├── 0002_rename_notificatio_user_id_created_idx_notificatio_user_id_05b4bc_idx_and_more.py
│   │   │   └── 0003_alter_notification_event_type_and_more.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── context_processors.py
│   │   ├── engine.py
│   │   ├── models.py
│   │   ├── tasks.py
│   │   ├── tests.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── onboarding/
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   └── 0001_initial.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── checklist.py
│   │   ├── context_processors.py
│   │   ├── models.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── organizations/
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   └── 0001_initial.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── tasks.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── publisher/
│   │   ├── management/
│   │   │   ├── commands/
│   │   │   │   ├── __init__.py
│   │   │   │   └── run_publisher.py
│   │   │   └── __init__.py
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   ├── 0001_initial.py
│   │   │   └── 0002_initial.py
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── engine.py
│   │   ├── models.py
│   │   ├── tasks.py
│   │   └── tests.py
│   ├── settings_manager/
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   └── 0001_initial.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── defaults.py
│   │   ├── helpers.py
│   │   ├── models.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── social_accounts/
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   ├── 0001_initial.py
│   │   │   ├── 0002_split_linkedin.py
│   │   │   ├── 0003_add_instagram_personal_platform.py
│   │   │   ├── 0004_platformvisibility.py
│   │   │   ├── 0005_seed_platform_visibility.py
│   │   │   ├── 0006_rename_instagram_personal_to_login.py
│   │   │   └── 0007_increase_avatar_url_length.py
│   │   ├── templatetags/
│   │   │   ├── __init__.py
│   │   │   └── social_accounts_tags.py
│   │   ├── tests/
│   │   │   ├── __init__.py
│   │   │   ├── test_error_messages.py
│   │   │   ├── test_models.py
│   │   │   ├── test_tasks.py
│   │   │   └── test_views.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── error_messages.py
│   │   ├── models.py
│   │   ├── tasks.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── workspaces/
│   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   ├── 0001_initial.py
│   │   │   ├── 0002_replace_icon_url_with_icon.py
│   │   │   └── 0003_alter_workspace_primary_color_and_more.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── __init__.py
│   └── background_task_config.py
├── config/
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── development.py
│   │   ├── production.py
│   │   └── test.py
│   ├── __init__.py
│   ├── asgi.py
│   ├── urls.py
│   └── wsgi.py
├── development_specs/
│   ├── architecture.md
│   ├── feature-spec-social-media-management-v2.md
│   └── style-guide-whitelabel.html
├── providers/
│   ├── __init__.py
│   ├── base.py
│   ├── bluesky.py
│   ├── exceptions.py
│   ├── facebook.py
│   ├── google_business.py
│   ├── instagram_login.py
│   ├── instagram.py
│   ├── linkedin_company.py
│   ├── linkedin_personal.py
│   ├── linkedin.py
│   ├── mastodon.py
│   ├── pinterest.py
│   ├── threads.py
│   ├── tiktok.py
│   ├── types.py
│   └── youtube.py
├── static/
│   ├── favicon/
│   │   ├── apple-touch-icon.png
│   │   ├── favicon-96x96.png
│   │   ├── favicon.ico
│   │   ├── favicon.svg
│   │   ├── site.webmanifest
│   │   ├── web-app-manifest-192x192.png
│   │   └── web-app-manifest-512x512.png
│   ├── img/
│   │   ├── brightbean-logo.webp
│   │   └── brightbean-studio-logo.webp
│   └── js/
│       ├── vendor/
│       │   ├── cropper.min.css
│       │   └── cropper.min.js
│       ├── .gitkeep
│       ├── alpine.min.js
│       ├── htmx.min.js
│       └── media-library.js
├── templates/
│   ├── account/
│   │   ├── email/
│   │   │   ├── email_confirmation_message.txt
│   │   │   ├── email_confirmation_signup_message.txt
│   │   │   ├── email_confirmation_signup_subject.txt
│   │   │   └── email_confirmation_subject.txt
│   │   ├── messages/
│   │   │   └── logged_in.txt
│   │   ├── accept_terms.html
│   │   ├── base_entrance.html
│   │   ├── email_confirm.html
│   │   ├── login.html
│   │   ├── logout.html
│   │   ├── password_reset_done.html
│   │   ├── password_reset_from_key_done.html
│   │   ├── password_reset_from_key.html
│   │   ├── password_reset.html
│   │   ├── signup.html
│   │   └── verification_sent.html
│   ├── accounts/
│   │   ├── dashboard.html
│   │   └── settings.html
│   ├── allauth/
│   │   ├── elements/
│   │   │   ├── alert.html
│   │   │   ├── button_group.html
│   │   │   ├── button.html
│   │   │   ├── field.html
│   │   │   ├── fields.html
│   │   │   ├── form.html
│   │   │   ├── h1.html
│   │   │   ├── h2.html
│   │   │   ├── hr.html
│   │   │   ├── p.html
│   │   │   ├── provider_list.html
│   │   │   └── provider.html
│   │   └── layouts/
│   │       ├── base.html
│   │       └── entrance.html
│   ├── approvals/
│   │   ├── partials/
│   │   │   ├── comment_form.html
│   │   │   ├── comment_list.html
│   │   │   ├── post_list.html
│   │   │   ├── post_row.html
│   │   │   └── version_diff.html
│   │   ├── org_queue.html
│   │   ├── queue.html
│   │   └── version_diff.html
│   ├── calendar/
│   │   ├── partials/
│   │   │   ├── _no_channels_empty_state.html
│   │   │   ├── day_grid.html
│   │   │   ├── event_form.html
│   │   │   ├── list_view.html
│   │   │   ├── month_grid.html
│   │   │   ├── publish_approvals.html
│   │   │   ├── publish_calendar_shell.html
│   │   │   ├── publish_drafts.html
│   │   │   ├── publish_list_shell.html
│   │   │   ├── publish_queue.html
│   │   │   ├── publish_sent.html
│   │   │   └── week_grid.html
│   │   ├── calendar.html
│   │   ├── posting_slots.html
│   │   ├── queue_detail.html
│   │   └── queues.html
│   ├── client_portal/
│   │   ├── admin/
│   │   │   ├── partials/
│   │   │   │   ├── client_row.html
│   │   │   │   ├── invite_client_modal.html
│   │   │   │   └── pending_invites_section.html
│   │   │   └── client_list.html
│   │   ├── email/
│   │   │   ├── magic_link.html
│   │   │   └── magic_link.txt
│   │   ├── activity.html
│   │   ├── approval_queue.html
│   │   ├── dashboard.html
│   │   ├── magic_link_confirm.html
│   │   ├── magic_link_expired.html
│   │   ├── portal_base.html
│   │   ├── published.html
│   │   └── reports.html
│   ├── composer/
│   │   ├── partials/
│   │   │   ├── csv_mapping.html
│   │   │   ├── csv_progress.html
│   │   │   ├── csv_validation.html
│   │   │   ├── feed_events_batch.html
│   │   │   ├── feeds_explore.html
│   │   │   ├── feeds_tab.html
│   │   │   ├── idea_card.html
│   │   │   ├── kanban_board.html
│   │   │   ├── kanban_column.html
│   │   │   ├── media_list_pending.html
│   │   │   ├── media_list.html
│   │   │   ├── media_picker.html
│   │   │   ├── preview_panel.html
│   │   │   ├── template_gallery.html
│   │   │   ├── template_picker.html
│   │   │   └── thumbnail_picker.html
│   │   ├── categories.html
│   │   ├── compose.html
│   │   ├── create_landing.html
│   │   ├── csv_import.html
│   │   ├── drafts_list.html
│   │   └── templates_list.html
│   ├── credentials/
│   │   └── list.html
│   ├── inbox/
│   │   ├── partials/
│   │   │   ├── _assignment_dropdown.html
│   │   │   ├── _empty_state.html
│   │   │   ├── _filter_bar.html
│   │   │   ├── _message_list.html
│   │   │   ├── _message_panel.html
│   │   │   ├── _message_row.html
│   │   │   ├── _note_item.html
│   │   │   ├── _reply_composer.html
│   │   │   ├── _reply_item.html
│   │   │   ├── _saved_reply_form.html
│   │   │   ├── _sentiment_badge.html
│   │   │   ├── _sla_badge.html
│   │   │   └── _status_badge.html
│   │   ├── feed.html
│   │   ├── message_detail.html
│   │   ├── saved_replies.html
│   │   └── sla_config.html
│   ├── layouts/
│   │   ├── settings.html
│   │   └── workspace_settings.html
│   ├── media_library/
│   │   ├── _asset_card.html
│   │   ├── _asset_detail_panel.html
│   │   ├── _asset_grid_items.html
│   │   ├── _asset_grid.html
│   │   ├── _asset_list_row.html
│   │   ├── _delete_blocked.html
│   │   ├── _empty_state.html
│   │   ├── _folder_form.html
│   │   ├── _folder_tree.html
│   │   ├── _shared_asset_card.html
│   │   ├── _shared_asset_grid_items.html
│   │   ├── _shared_asset_grid.html
│   │   ├── _star_button.html
│   │   ├── _tag_input.html
│   │   ├── _tag_list.html
│   │   ├── _version_list.html
│   │   ├── asset_detail.html
│   │   ├── asset_edit.html
│   │   ├── library_index.html
│   │   └── shared_library.html
│   ├── members/
│   │   ├── email/
│   │   │   ├── invite.html
│   │   │   └── invite.txt
│   │   ├── partials/
│   │   │   ├── invitation_row.html
│   │   │   ├── invite_modal.html
│   │   │   ├── member_row.html
│   │   │   └── workspace_assignments.html
│   │   ├── accept_invite.html
│   │   ├── invite_expired.html
│   │   └── list.html
│   ├── notifications/
│   │   ├── email/
│   │   │   ├── digest.html
│   │   │   ├── digest.txt
│   │   │   ├── notification.html
│   │   │   └── notification.txt
│   │   ├── partials/
│   │   │   ├── drawer.html
│   │   │   ├── empty.html
│   │   │   └── history_list.html
│   │   ├── history.html
│   │   └── preferences.html
│   ├── onboarding/
│   │   ├── email/
│   │   │   ├── connection_link.html
│   │   │   └── connection_link.txt
│   │   ├── partials/
│   │   │   ├── _checklist.html
│   │   │   └── _connection_link_created.html
│   │   ├── connection_expired.html
│   │   ├── connection_page.html
│   │   └── connection_success.html
│   ├── organizations/
│   │   ├── partials/
│   │   │   ├── day_grid.html
│   │   │   ├── week_grid.html
│   │   │   └── workspace_card.html
│   │   ├── cross_calendar.html
│   │   ├── settings.html
│   │   └── workspaces.html
│   ├── partials/
│   │   └── _platform_icon.html
│   ├── settings_manager/
│   │   └── index.html
│   ├── social_accounts/
│   │   ├── partials/
│   │   │   ├── _account_card.html
│   │   │   ├── _empty.html
│   │   │   ├── _platform_icon.html
│   │   │   ├── _posting_slots_grid.html
│   │   │   └── _status_badge.html
│   │   ├── account_select.html
│   │   ├── bluesky_connect.html
│   │   ├── connect.html
│   │   ├── list.html
│   │   └── mastodon_connect.html
│   ├── workspaces/
│   │   ├── approvals_settings.html
│   │   ├── list.html
│   │   └── settings.html
│   └── base.html
├── tests/
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── test_base.py
│   │   └── test_bluesky.py
│   └── __init__.py
├── theme/
│   ├── static_src/
│   │   ├── src/
│   │   │   └── styles.css
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   └── tailwind.config.js
│   ├── __init__.py
│   └── apps.py
├── .env.example
├── .gitignore
├── .gitleaks.toml
├── .pre-commit-config.yaml
├── .python-version
├── app.json
├── Caddyfile
├── conftest.py
├── CONTRIBUTING.md
├── docker-compose.override.yml
├── docker-compose.prod.yml
├── docker-compose.yml
├── Dockerfile
├── LICENSE
├── Makefile
├── manage.py
├── package.json
├── Procfile
├── pyproject.toml
├── railway.toml
├── README.md
├── render.yaml
├── requirements.txt
└── SECURITY.md
```