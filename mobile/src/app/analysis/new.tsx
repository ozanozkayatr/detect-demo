import { Feather } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Redirect, Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SectionCard } from '@/components/section-card';
import { StatusPill } from '@/components/status-pill';
import { palette, radii, spacing, typography } from '@/design/theme';
import { sampleVideos, type SampleVideo } from '@/features/demo-videos/sample-videos';
import { useAthleteProfile } from '@/features/athlete-profile/athlete-profile-context';
import {
  getBackendPersonaKey,
  getExperienceLevelLabel,
  getStanceLabel,
} from '@/features/athlete-profile/options';
import {
  createAnalysis,
  fetchPromptTemplates,
  syncPromptTemplates,
  uploadVideoFile,
  type PromptTemplateRecord,
  type VideoRecord,
} from '@/lib/api';
import { mobileConfig } from '@/lib/config';

type LocalVideoAsset = {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  durationMs: number | null;
};

export default function NewAnalysisScreen() {
  const router = useRouter();
  const {
    bootstrapError,
    hasProfile,
    isBootstrapping,
    profile,
    reviewSubject,
  } = useAthleteProfile();
  const [localAsset, setLocalAsset] = useState<LocalVideoAsset | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<VideoRecord | null>(null);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplateRecord[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [syncingPrompts, setSyncingPrompts] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const previewUri = localAsset?.uri ?? null;
  const previewPlayer = useVideoPlayer(
    previewUri ? { uri: previewUri } : null,
    (currentPlayer) => {
      currentPlayer.loop = true;
    },
  );

  const loadPromptTemplates = useCallback(async () => {
    setLoadingPrompts(true);
    setPromptError(null);
    try {
      const templates = dedupePromptTemplates(await fetchPromptTemplates());
      setPromptTemplates(templates);
      setSelectedPromptId((current) => current ?? templates[0]?.id ?? null);
    } catch (nextError) {
      setPromptError(
        nextError instanceof Error ? nextError.message : 'Could not load prompt templates.',
      );
    } finally {
      setLoadingPrompts(false);
    }
  }, []);

  useEffect(() => {
    void loadPromptTemplates();
  }, [loadPromptTemplates]);

  const selectedPrompt = useMemo(
    () => promptTemplates.find((template) => template.id === selectedPromptId) ?? null,
    [promptTemplates, selectedPromptId],
  );
  const personaKey = profile ? getBackendPersonaKey(profile) : null;
  const focusNote = userPrompt.trim();
  const runReadinessHint = useMemo(() => {
    if (!reviewSubject) {
      return 'Complete the athlete profile first.';
    }

    if (!uploadedVideo) {
      return 'Choose a clip first.';
    }

    if (!selectedPrompt) {
      return 'Choose a review mode.';
    }

    return null;
  }, [reviewSubject, selectedPrompt, uploadedVideo]);

  if (!isBootstrapping && !bootstrapError && !hasProfile) {
    return <Redirect href="/onboarding" />;
  }

  async function uploadSelectedVideo(nextAsset: LocalVideoAsset) {
    setUploadError(null);
    setLocalAsset(nextAsset);
    setUploadedVideo(null);

    setUploading(true);
    try {
      const video = await uploadVideoFile(nextAsset);
      setUploadedVideo(video);
    } catch (nextError) {
      setUploadError(nextError instanceof Error ? nextError.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handlePickVideo() {
    setUploadError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setUploadError('Media library access is required to choose a boxing clip.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    const nextAsset: LocalVideoAsset = {
      uri: asset.uri,
      name: asset.fileName ?? `boxing-clip-${Date.now()}.mp4`,
      mimeType: asset.mimeType ?? 'video/mp4',
      sizeBytes: asset.fileSize ?? null,
      durationMs: asset.duration ?? null,
    };

    await uploadSelectedVideo(nextAsset);
  }

  async function handleUseSampleVideo(sampleVideo: SampleVideo) {
    setUploadError(null);
    try {
      const asset = Asset.fromModule(sampleVideo.moduleId);
      if (!asset.localUri) {
        await asset.downloadAsync();
      }

      const nextAsset: LocalVideoAsset = {
        uri: asset.localUri ?? asset.uri,
        name: sampleVideo.filename,
        mimeType: sampleVideo.mimeType,
        sizeBytes: null,
        durationMs: null,
      };

      await uploadSelectedVideo(nextAsset);
    } catch (nextError) {
      setUploadError(
        nextError instanceof Error
          ? nextError.message
          : 'Sample video could not be loaded.',
      );
    }
  }

  async function handleSyncPromptTemplates() {
    setPromptError(null);
    setSyncingPrompts(true);
    try {
      await syncPromptTemplates();
      await loadPromptTemplates();
    } catch (nextError) {
      setPromptError(nextError instanceof Error ? nextError.message : 'Prompt sync failed.');
    } finally {
      setSyncingPrompts(false);
    }
  }

  async function handleRunAnalysis() {
    if (!uploadedVideo || !selectedPrompt || !personaKey) {
      return;
    }

    setAnalysisError(null);
    setRunningAnalysis(true);

    try {
      const result = await createAnalysis({
        video_id: uploadedVideo.id,
        prompt_template_id: selectedPrompt.id,
        persona_key: personaKey,
        user_prompt: userPrompt.trim() || null,
      });
      router.replace(`/analysis/${result.id}`);
    } catch (nextError) {
      setAnalysisError(nextError instanceof Error ? nextError.message : 'Review failed.');
    } finally {
      setRunningAnalysis(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AppScreen
        title="New review"
        rightSlot={
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Feather name="x" size={20} color={palette.text} />
          </Pressable>
        }>
        {bootstrapError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{bootstrapError}</Text>
          </View>
        ) : null}

        <SectionCard title="1. Clip">
          <PrimaryButton
            label={
              uploading
                ? 'Uploading...'
                : localAsset
                  ? 'Replace clip'
                  : 'Choose clip'
            }
            icon={<Feather name="upload" size={20} color="#ffffff" />}
            disabled={isBootstrapping || Boolean(bootstrapError) || uploading}
            onPress={handlePickVideo}
          />

          {mobileConfig.enableSampleClips ? (
            <View style={styles.devUtilityCard}>
              <Text style={styles.devUtilityTitle}>Sample clips</Text>
              <View style={styles.sampleVideoList}>
                {sampleVideos.map((sampleVideo) => (
                  <Pressable
                    key={sampleVideo.id}
                    disabled={uploading}
                    onPress={() => handleUseSampleVideo(sampleVideo)}
                    style={({ pressed }) => [
                      styles.sampleVideoButton,
                      uploading && styles.disabledSurface,
                      pressed && !uploading && styles.pressedSurface,
                    ]}>
                    <Text style={styles.sampleVideoTitle}>{sampleVideo.title}</Text>
                    <Text style={styles.sampleVideoFilename}>{sampleVideo.filename}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {uploading ? (
            <View style={styles.inlineStatus}>
              <ActivityIndicator color={palette.accent} />
              <Text style={styles.bodyText}>Uploading clip...</Text>
            </View>
          ) : null}

          {localAsset ? (
            <View style={styles.clipPreviewCard}>
              <VideoView
                style={styles.clipPreviewVideo}
                player={previewPlayer}
                nativeControls
                contentFit="contain"
              />

              <View style={styles.summaryGrid}>
                <InfoCell label="Filename" value={localAsset.name} />
                <InfoCell
                  label="Size"
                  value={formatFileSize(localAsset.sizeBytes) ?? 'Unavailable'}
                />
                <InfoCell
                  label="Duration"
                  value={formatDuration(localAsset.durationMs) ?? 'Unavailable'}
                />
                <InfoCell label="MIME type" value={localAsset.mimeType} />
              </View>
            </View>
          ) : null}

          {uploadError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{uploadError}</Text>
            </View>
          ) : null}
        </SectionCard>

        <SectionCard title="2. Review mode">
          <View style={styles.sectionHeaderRow}>
            {loadingPrompts ? (
              <Text style={styles.sectionMetaText}>Loading modes...</Text>
            ) : null}
            <Pressable
              disabled={loadingPrompts || syncingPrompts}
              onPress={handleSyncPromptTemplates}
              style={({ pressed }) => [
                styles.smallActionButton,
                (loadingPrompts || syncingPrompts) && styles.disabledSurface,
                pressed && !(loadingPrompts || syncingPrompts) && styles.pressedSurface,
              ]}>
              <Text style={styles.smallActionLabel}>
                {syncingPrompts ? 'Syncing...' : 'Sync prompts'}
              </Text>
            </Pressable>
          </View>

          {promptTemplates.length > 0 ? (
            <View style={styles.promptList}>
              {promptTemplates.map((template) => (
                <Pressable
                  key={template.id}
                  onPress={() => setSelectedPromptId(template.id)}
                  style={({ pressed }) => [
                    styles.promptCard,
                    selectedPromptId === template.id && styles.promptCardSelected,
                    pressed && styles.pressedSurface,
                  ]}>
                  <View style={styles.promptHeader}>
                    <StatusPill
                      label={
                        selectedPromptId === template.id
                          ? 'Selected'
                          : getPromptModeTag(template.key)
                      }
                      tone={selectedPromptId === template.id ? 'success' : 'neutral'}
                    />
                  </View>
                  <Text style={styles.promptTitle}>{template.title}</Text>
                  {template.description ? (
                    <Text style={styles.promptDescription} numberOfLines={2}>
                      {template.description}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : !loadingPrompts ? (
            <View style={styles.stack}>
              <Text style={styles.bodyText}>
                No prompt templates are available yet.
              </Text>
              <PrimaryButton
                label="Refresh prompts"
                onPress={() => void loadPromptTemplates()}
              />
            </View>
          ) : null}

          {promptError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{promptError}</Text>
              <Pressable
                onPress={() => void loadPromptTemplates()}
                style={styles.retryButton}>
                <Text style={styles.retryLabel}>Retry prompt load</Text>
              </Pressable>
            </View>
          ) : null}
        </SectionCard>

        <SectionCard title="3. Focus note">
          <TextInput
            value={userPrompt}
            onChangeText={setUserPrompt}
            placeholder="I’m the boxer on the right. Focus on guard and balance."
            placeholderTextColor={palette.textSoft}
            multiline
            style={[styles.textArea, styles.multilineInput]}
          />
        </SectionCard>

        <SectionCard title="4. Run review">
          <View style={styles.contextPillRow}>
            <StatusPill label={uploadedVideo ? 'Clip ready' : 'Clip missing'} tone={uploadedVideo ? 'success' : 'neutral'} />
            <StatusPill label={selectedPrompt ? 'Mode selected' : 'Mode missing'} tone={selectedPrompt ? 'success' : 'neutral'} />
            <StatusPill label={profile ? 'Athlete ready' : 'Athlete missing'} tone={profile ? 'success' : 'neutral'} />
          </View>
          <View style={styles.contextCard}>
            <View style={styles.contextRow}>
              <Text style={styles.contextLabel}>Saved clip</Text>
              <Text style={styles.contextValue}>
                {uploadedVideo?.original_filename ?? localAsset?.name ?? 'No clip saved yet'}
              </Text>
            </View>
            <View style={styles.contextRow}>
              <Text style={styles.contextLabel}>Athlete profile</Text>
              <Text style={styles.contextValue}>
                {profile
                  ? `${profile.name} · ${getExperienceLevelLabel(profile.experienceLevel)} · ${getStanceLabel(profile.stance)}`
                  : 'No athlete profile selected yet'}
              </Text>
            </View>
            <View style={styles.contextRow}>
              <Text style={styles.contextLabel}>Review mode</Text>
              <Text style={styles.contextValue}>
                {selectedPrompt?.title ?? 'No review mode selected yet'}
              </Text>
            </View>
            {focusNote ? (
              <View style={styles.contextNote}>
                <Text style={styles.contextLabel}>Focus note</Text>
                <Text style={styles.contextValue}>{focusNote}</Text>
              </View>
            ) : null}
          </View>

          {runReadinessHint && !runningAnalysis ? (
            <View style={styles.helperCard}>
              <Text style={styles.helperText}>{runReadinessHint}</Text>
            </View>
          ) : null}

          <PrimaryButton
            label={runningAnalysis ? 'Running review...' : 'Run review'}
            disabled={
              isBootstrapping ||
              Boolean(bootstrapError) ||
              runningAnalysis ||
              !uploadedVideo ||
              !selectedPrompt ||
              !personaKey
            }
            onPress={handleRunAnalysis}
          />

          {isBootstrapping ? (
            <View style={styles.inlineStatus}>
              <ActivityIndicator color={palette.accent} />
              <Text style={styles.bodyText}>Loading profile...</Text>
            </View>
          ) : null}

          {runningAnalysis ? (
            <View style={styles.inlineStatus}>
              <ActivityIndicator color={palette.accent} />
              <Text style={styles.bodyText}>Sending to Gemini...</Text>
            </View>
          ) : null}

          {analysisError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{analysisError}</Text>
            </View>
          ) : null}
        </SectionCard>

      </AppScreen>
    </>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatFileSize(sizeBytes: number | null) {
  if (!sizeBytes) {
    return null;
  }

  const mb = sizeBytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function formatDuration(durationMs: number | null) {
  if (!durationMs) {
    return null;
  }

  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatOutputType(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function dedupePromptTemplates(templates: PromptTemplateRecord[]) {
  const seen = new Set<string>();

  return templates.filter((template) => {
    const normalizedKey = template.key.trim().toLowerCase();
    if (seen.has(normalizedKey)) {
      return false;
    }

    seen.add(normalizedKey);
    return true;
  });
}

function getPromptModeTag(key: string) {
  switch (key.trim().toLowerCase()) {
    case 'boxing_structured':
      return 'Structured';
    case 'coach_summary':
      return 'Coach';
    case 'observable_only':
      return 'Visible only';
    default:
      return formatOutputType(key);
  }
}

const styles = StyleSheet.create({
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  stack: {
    gap: spacing.md,
  },
  sectionHeaderRow: {
    gap: spacing.sm,
  },
  sectionMetaText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
  promptList: {
    gap: spacing.md,
  },
  promptCard: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  promptCardSelected: {
    borderColor: 'rgba(106, 31, 42, 0.2)',
    backgroundColor: palette.accentSoft,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  promptTitle: {
    fontSize: typography.heading,
    lineHeight: 28,
    fontWeight: '700',
    color: palette.text,
  },
  promptDescription: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
  contextCard: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceMuted,
  },
  contextRow: {
    gap: spacing.xs,
  },
  contextPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  contextLabel: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  contextValue: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
  contextNote: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.borderStrong,
  },
  helperCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  helperText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
  smallActionButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.surface,
  },
  smallActionLabel: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    fontWeight: '700',
    color: palette.text,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  retryLabel: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    fontWeight: '700',
    color: '#93000a',
  },
  inlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bodyText: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
  sampleVideoList: {
    gap: spacing.sm,
  },
  pressedSurface: {
    opacity: 0.92,
  },
  disabledSurface: {
    opacity: 0.5,
  },
  devUtilityCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceMuted,
  },
  devUtilityTitle: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: palette.textSoft,
  },
  sampleVideoButton: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceMuted,
  },
  sampleVideoTitle: {
    fontSize: typography.body,
    lineHeight: 24,
    fontWeight: '700',
    color: palette.text,
  },
  sampleVideoFilename: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
  },
  clipPreviewCard: {
    gap: spacing.md,
  },
  clipPreviewVideo: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: radii.md,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  summaryGrid: {
    gap: spacing.sm,
  },
  infoCell: {
    flex: 1,
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.borderStrong,
  },
  fieldLabel: {
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: palette.textSoft,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
  textArea: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    backgroundColor: palette.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    lineHeight: 22,
    color: palette.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  multilineInput: {
    minHeight: 120,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.18)',
    backgroundColor: '#ffefec',
    borderRadius: radii.md,
    padding: spacing.md,
  },
  errorText: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: '#93000a',
  },
});
