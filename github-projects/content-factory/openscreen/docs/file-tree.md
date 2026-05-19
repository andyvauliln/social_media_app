# File Tree — siddharthvaddem/openscreen

```text
./
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   └── feature_request.yml
│   ├── workflows/
│   │   ├── build.yml
│   │   ├── bump-nix-package.yml
│   │   ├── ci.yml
│   │   ├── discord.yaml
│   │   ├── publish-winget.yml
│   │   └── update-homebrew-cask.yml
│   ├── CODEOWNERS
│   └── pull_request_template.md
├── .husky/
│   └── pre-commit
├── docs/
│   ├── architecture/
│   │   └── native-bridge.md
│   ├── engineering/
│   │   ├── macos-native-recorder-roadmap.md
│   │   └── windows-native-recorder-roadmap.md
│   ├── testing/
│   │   └── windows-native-cursor.md
│   └── tests/
│       └── writing-tests.md
├── electron/
│   ├── ipc/
│   │   ├── handlers.ts
│   │   └── nativeBridge.ts
│   ├── native/
│   │   ├── screencapturekit/
│   │   │   ├── Sources/
│   │   │   │   ├── OpenScreenMacOSCursorHelper/
│   │   │   │   │   └── main.swift
│   │   │   │   └── OpenScreenScreenCaptureKitHelper/
│   │   │   │       └── main.swift
│   │   │   └── Package.swift
│   │   ├── wgc-capture/
│   │   │   ├── src/
│   │   │   │   ├── audio_sample_utils.cpp
│   │   │   │   ├── audio_sample_utils.h
│   │   │   │   ├── dshow_webcam_capture.cpp
│   │   │   │   ├── dshow_webcam_capture.h
│   │   │   │   ├── main.cpp
│   │   │   │   ├── mf_encoder.cpp
│   │   │   │   ├── mf_encoder.h
│   │   │   │   ├── monitor_utils.cpp
│   │   │   │   ├── monitor_utils.h
│   │   │   │   ├── wasapi_loopback_capture.cpp
│   │   │   │   ├── wasapi_loopback_capture.h
│   │   │   │   ├── webcam_capture.cpp
│   │   │   │   ├── webcam_capture.h
│   │   │   │   ├── wgc_session.cpp
│   │   │   │   └── wgc_session.h
│   │   │   └── CMakeLists.txt
│   │   └── README.md
│   ├── native-bridge/
│   │   ├── cursor/
│   │   │   ├── recording/
│   │   │   │   ├── factory.ts
│   │   │   │   ├── macNativeCursorRecordingSession.ts
│   │   │   │   ├── session.ts
│   │   │   │   ├── telemetryRecordingSession.ts
│   │   │   │   ├── windowsNativeRecordingSession.script.ts
│   │   │   │   ├── windowsNativeRecordingSession.ts
│   │   │   │   └── windowsNativeRecordingSession.types.ts
│   │   │   ├── adapter.ts
│   │   │   └── telemetryCursorAdapter.ts
│   │   ├── services/
│   │   │   ├── cursorService.ts
│   │   │   ├── projectService.ts
│   │   │   └── systemService.ts
│   │   └── store.ts
│   ├── electron-env.d.ts
│   ├── i18n.ts
│   ├── main.ts
│   ├── preload.ts
│   └── windows.ts
├── icons/
│   └── icons/
│       ├── mac/
│       │   └── icon.icns
│       ├── png/
│       │   ├── 1024x1024.png
│       │   ├── 128x128.png
│       │   ├── 16x16.png
│       │   ├── 24x24.png
│       │   ├── 256x256.png
│       │   ├── 32x32.png
│       │   ├── 48x48.png
│       │   ├── 512x512.png
│       │   └── 64x64.png
│       └── win/
│           └── icon.ico
├── nix/
│   ├── hm-module.nix
│   ├── module.nix
│   └── package.nix
├── public/
│   ├── wallpapers/
│   │   ├── wallpaper1.jpg
│   │   ├── wallpaper10.jpg
│   │   ├── wallpaper11.jpg
│   │   ├── wallpaper12.jpg
│   │   ├── wallpaper13.jpg
│   │   ├── wallpaper14.jpg
│   │   ├── wallpaper15.jpg
│   │   ├── wallpaper16.jpg
│   │   ├── wallpaper17.jpg
│   │   ├── wallpaper18.jpg
│   │   ├── wallpaper2.jpg
│   │   ├── wallpaper3.jpg
│   │   ├── wallpaper4.jpg
│   │   ├── wallpaper5.jpg
│   │   ├── wallpaper6.jpg
│   │   ├── wallpaper7.jpg
│   │   ├── wallpaper8.jpg
│   │   └── wallpaper9.jpg
│   ├── wasm/
│   │   └── web-demuxer.wasm
│   ├── openscreen.png
│   ├── preview3.png
│   ├── preview4.png
│   ├── rec-button.png
│   └── vite.svg
├── scripts/
│   ├── build_macos.sh
│   ├── build-macos-screencapturekit-helper.mjs
│   ├── build-windows-wgc-helper.mjs
│   ├── capture-openscreen-preview.mjs
│   ├── i18n-check.mjs
│   ├── inspect-native-cursor-click-bounce.mjs
│   ├── test-windows-native-cursor.mjs
│   └── test-windows-wgc-helper.mjs
├── src/
│   ├── assets/
│   │   ├── cursors/
│   │   │   ├── Cursor=App-Starting.svg
│   │   │   ├── Cursor=Beachball.svg
│   │   │   ├── Cursor=Cross.svg
│   │   │   ├── Cursor=Default.svg
│   │   │   ├── Cursor=Hand-(Grabbing).svg
│   │   │   ├── Cursor=Hand-(Open).svg
│   │   │   ├── Cursor=Hand-(Pointing).svg
│   │   │   ├── Cursor=Help.svg
│   │   │   ├── Cursor=Menu.svg
│   │   │   ├── Cursor=Move.svg
│   │   │   ├── Cursor=Not-Allowed.svg
│   │   │   ├── Cursor=Resize-(Down).svg
│   │   │   ├── Cursor=Resize-(Left-Right).svg
│   │   │   ├── Cursor=Resize-(Left).svg
│   │   │   ├── Cursor=Resize-(Right).svg
│   │   │   ├── Cursor=Resize-(Up-Down).svg
│   │   │   ├── Cursor=Resize-(Up).svg
│   │   │   ├── Cursor=Resize-North-East-South-West.svg
│   │   │   ├── Cursor=Resize-North-South.svg
│   │   │   ├── Cursor=Resize-North-West-South-East.svg
│   │   │   ├── Cursor=Resize-West-East.svg
│   │   │   ├── Cursor=Text-Cursor.svg
│   │   │   ├── Cursor=Up-Arrow.svg
│   │   │   ├── Cursor=Wait.svg
│   │   │   ├── Cursor=Zoom-In.svg
│   │   │   └── Cursor=Zoom-Out.svg
│   │   └── react.svg
│   ├── components/
│   │   ├── launch/
│   │   │   ├── CountdownOverlay.tsx
│   │   │   ├── LaunchWindow.module.css
│   │   │   ├── LaunchWindow.tsx
│   │   │   ├── SourceSelector.module.css
│   │   │   └── SourceSelector.tsx
│   │   ├── ui/
│   │   │   ├── accordion.tsx
│   │   │   ├── audio-level-meter.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── color-picker.tsx
│   │   │   ├── content-clamp.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── item-content.tsx
│   │   │   ├── label.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── select.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── sonner.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toggle-group.tsx
│   │   │   ├── toggle.tsx
│   │   │   └── tooltip.tsx
│   │   └── video-editor/
│   │       ├── timeline/
│   │       │   ├── Item.module.css
│   │       │   ├── Item.tsx
│   │       │   ├── ItemGlass.module.css
│   │       │   ├── KeyframeMarkers.tsx
│   │       │   ├── Row.tsx
│   │       │   ├── Subrow.tsx
│   │       │   ├── TimelineEditor.tsx
│   │       │   ├── TimelineWrapper.tsx
│   │       │   └── zoomSuggestionUtils.ts
│   │       ├── videoPlayback/
│   │       │   ├── constants.ts
│   │       │   ├── cursorFollowUtils.ts
│   │       │   ├── cursorRenderer.ts
│   │       │   ├── focusUtils.ts
│   │       │   ├── index.ts
│   │       │   ├── layoutUtils.ts
│   │       │   ├── mathUtils.ts
│   │       │   ├── motionSmoothing.ts
│   │       │   ├── overlayUtils.ts
│   │       │   ├── uploadedCursorAssets.ts
│   │       │   ├── videoEventHandlers.ts
│   │       │   ├── zoomRegionUtils.ts
│   │       │   └── zoomTransform.ts
│   │       ├── AddCustomFontDialog.tsx
│   │       ├── AnnotationOverlay.tsx
│   │       ├── AnnotationSettingsPanel.tsx
│   │       ├── ArrowSvgs.tsx
│   │       ├── BlurSettingsPanel.tsx
│   │       ├── CropControl.tsx
│   │       ├── ExportDialog.tsx
│   │       ├── FormatSelector.tsx
│   │       ├── GifOptionsPanel.tsx
│   │       ├── index.ts
│   │       ├── KeyboardShortcutsHelp.tsx
│   │       ├── PlaybackControls.tsx
│   │       ├── projectPersistence.test.ts
│   │       ├── projectPersistence.ts
│   │       ├── SettingsPanel.tsx
│   │       ├── ShortcutsConfigDialog.tsx
│   │       ├── TutorialHelp.tsx
│   │       ├── types.ts
│   │       ├── UnsavedChangesDialog.tsx
│   │       ├── VideoEditor.tsx
│   │       └── VideoPlayback.tsx
│   ├── contexts/
│   │   ├── I18nContext.tsx
│   │   └── ShortcutsContext.tsx
│   ├── hooks/
│   │   ├── useAudioLevelMeter.ts
│   │   ├── useCameraDevices.test.ts
│   │   ├── useCameraDevices.ts
│   │   ├── useEditorHistory.ts
│   │   ├── useMicrophoneDevices.ts
│   │   └── useScreenRecorder.ts
│   ├── i18n/
│   │   ├── __tests__/
│   │   │   └── tutorialHelpTranslations.test.ts
│   │   ├── locales/
│   │   │   ├── ar/
│   │   │   │   ├── common.json
│   │   │   │   ├── dialogs.json
│   │   │   │   ├── editor.json
│   │   │   │   ├── launch.json
│   │   │   │   ├── settings.json
│   │   │   │   ├── shortcuts.json
│   │   │   │   └── timeline.json
│   │   │   ├── en/
│   │   │   │   ├── common.json
│   │   │   │   ├── dialogs.json
│   │   │   │   ├── editor.json
│   │   │   │   ├── launch.json
│   │   │   │   ├── settings.json
│   │   │   │   ├── shortcuts.json
│   │   │   │   └── timeline.json
│   │   │   ├── es/
│   │   │   │   ├── common.json
│   │   │   │   ├── dialogs.json
│   │   │   │   ├── editor.json
│   │   │   │   ├── launch.json
│   │   │   │   ├── settings.json
│   │   │   │   ├── shortcuts.json
│   │   │   │   └── timeline.json
│   │   │   ├── fr/
│   │   │   │   ├── common.json
│   │   │   │   ├── dialogs.json
│   │   │   │   ├── editor.json
│   │   │   │   ├── launch.json
│   │   │   │   ├── settings.json
│   │   │   │   ├── shortcuts.json
│   │   │   │   └── timeline.json
│   │   │   ├── ja-JP/
│   │   │   │   ├── common.json
│   │   │   │   ├── dialogs.json
│   │   │   │   ├── editor.json
│   │   │   │   ├── launch.json
│   │   │   │   ├── settings.json
│   │   │   │   ├── shortcuts.json
│   │   │   │   └── timeline.json
│   │   │   ├── ko-KR/
│   │   │   │   ├── common.json
│   │   │   │   ├── dialogs.json
│   │   │   │   ├── editor.json
│   │   │   │   ├── launch.json
│   │   │   │   ├── settings.json
│   │   │   │   ├── shortcuts.json
│   │   │   │   └── timeline.json
│   │   │   ├── ru/
│   │   │   │   ├── common.json
│   │   │   │   ├── dialogs.json
│   │   │   │   ├── editor.json
│   │   │   │   ├── launch.json
│   │   │   │   ├── settings.json
│   │   │   │   ├── shortcuts.json
│   │   │   │   └── timeline.json
│   │   │   ├── tr/
│   │   │   │   ├── common.json
│   │   │   │   ├── dialogs.json
│   │   │   │   ├── editor.json
│   │   │   │   ├── launch.json
│   │   │   │   ├── settings.json
│   │   │   │   ├── shortcuts.json
│   │   │   │   └── timeline.json
│   │   │   ├── vi/
│   │   │   │   ├── common.json
│   │   │   │   ├── dialogs.json
│   │   │   │   ├── editor.json
│   │   │   │   ├── launch.json
│   │   │   │   ├── settings.json
│   │   │   │   ├── shortcuts.json
│   │   │   │   └── timeline.json
│   │   │   ├── zh-CN/
│   │   │   │   ├── common.json
│   │   │   │   ├── dialogs.json
│   │   │   │   ├── editor.json
│   │   │   │   ├── launch.json
│   │   │   │   ├── settings.json
│   │   │   │   ├── shortcuts.json
│   │   │   │   └── timeline.json
│   │   │   └── zh-TW/
│   │   │       ├── common.json
│   │   │       ├── dialogs.json
│   │   │       ├── editor.json
│   │   │       ├── launch.json
│   │   │       ├── settings.json
│   │   │       ├── shortcuts.json
│   │   │       └── timeline.json
│   │   ├── config.ts
│   │   └── loader.ts
│   ├── lib/
│   │   ├── __tests__/
│   │   │   └── frameStepNavigation.test.ts
│   │   ├── cursor/
│   │   │   ├── nativeCursor.test.ts
│   │   │   └── nativeCursor.ts
│   │   ├── exporter/
│   │   │   ├── annotationRenderer.ts
│   │   │   ├── asyncVideoFrameQueue.ts
│   │   │   ├── audioEncoder.test.ts
│   │   │   ├── audioEncoder.ts
│   │   │   ├── frameRenderer.ts
│   │   │   ├── gifExporter.browser.test.ts
│   │   │   ├── gifExporter.test.ts
│   │   │   ├── gifExporter.ts
│   │   │   ├── gradientParser.test.ts
│   │   │   ├── gradientParser.ts
│   │   │   ├── index.ts
│   │   │   ├── mp4ExportSettings.test.ts
│   │   │   ├── mp4ExportSettings.ts
│   │   │   ├── muxer.ts
│   │   │   ├── streamingDecoder.test.ts
│   │   │   ├── streamingDecoder.ts
│   │   │   ├── threeDPass.ts
│   │   │   ├── types.ts
│   │   │   ├── videoDecoder.ts
│   │   │   ├── videoExporter.browser.test.ts
│   │   │   ├── videoExporter.test.ts
│   │   │   └── videoExporter.ts
│   │   ├── assetPath.ts
│   │   ├── blurEffects.test.ts
│   │   ├── blurEffects.ts
│   │   ├── compositeLayout.test.ts
│   │   ├── compositeLayout.ts
│   │   ├── cursorTelemetryBuffer.test.ts
│   │   ├── cursorTelemetryBuffer.ts
│   │   ├── customFonts.ts
│   │   ├── frameStep.ts
│   │   ├── nativeMacRecording.test.ts
│   │   ├── nativeMacRecording.ts
│   │   ├── nativeWindowsRecording.ts
│   │   ├── recordingSession.ts
│   │   ├── requestCameraAccess.ts
│   │   ├── shortcuts.ts
│   │   ├── userPreferences.test.ts
│   │   ├── userPreferences.ts
│   │   ├── utils.ts
│   │   ├── wallpaper.test.ts
│   │   ├── wallpaper.ts
│   │   └── webcamMaskShapes.ts
│   ├── native/
│   │   ├── hooks/
│   │   │   ├── useCursorRecordingData.ts
│   │   │   └── useCursorTelemetry.ts
│   │   ├── client.ts
│   │   ├── contracts.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── aspectRatioUtils.test.ts
│   │   ├── aspectRatioUtils.ts
│   │   ├── getTestId.ts
│   │   ├── platformUtils.ts
│   │   └── timeUtils.ts
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── tests/
│   ├── e2e/
│   │   ├── gif-export.spec.ts
│   │   └── windows-native-checklist.spec.ts
│   └── fixtures/
│       ├── sample-inflated-duration.webm
│       └── sample.webm
├── .editorconfig
├── .env.example
├── .envrc
├── .gitignore
├── .nvmrc
├── biome.json
├── components.json
├── CONTRIBUTING.md
├── electron-builder.json5
├── flake.lock
├── flake.nix
├── index.html
├── LICENSE
├── macos.entitlements
├── package-lock.json
├── package.json
├── playwright.config.ts
├── postcss.config.cjs
├── README.md
├── tailwind.config.cjs
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.browser.config.ts
└── vitest.config.ts
```