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
      const templates = await fetchPromptTemplates();
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
      return 'Set up the athlete profile before you run the first review.';
    }

    if (!uploadedVideo) {
      return 'Choose a clip before you run the review.';
    }

    if (!selectedPrompt) {
      return 'Select a review mode before you continue.';
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
        eyebrow="New review"
        title="Prepare the next clip."
        subtitle="Upload one round, choose the review mode, and run a saved Gemini review."
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

        <SectionCard title="1. Choose clip" caption="The clip uploads immediately and attaches to this saved review.">
          <PrimaryButton
            label={localAsset ? 'Choose another clip' : 'Choose a boxing clip'}
            hint="Open the device video library"
            icon={<Feather name="upload" size={20} color="#ffffff" />}
            disabled={isBootstrapping || Boolean(bootstrapError)}
            onPress={handlePickVideo}
          />

          {mobileConfig.enableSampleClips ? (
            <View style={styles.devUtilityCard}>
              <Text style={styles.devUtilityTitle}>Development shortcuts</Text>
              <Text style={styles.metaText}>
                Use bundled sample clips while the real library flow is still being tested.
              </Text>
              <View style={styles.sampleVideoList}>
                {sampleVideos.map((sampleVideo) => (
                  <Pressable
                    key={sampleVideo.id}
                    onPress={() => handleUseSampleVideo(sampleVideo)}
                    style={styles.sampleVideoButton}>
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
              <Text style={styles.bodyText}>Uploading the selected clip to the backend...</Text>
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

          {uploadedVideo ? (
            <View style={styles.uploadedState}>
              <StatusPill label="Clip saved" tone="success" />
              <Text style={styles.metaText}>
                Ready to review: {uploadedVideo.original_filename}
              </Text>
            </View>
          ) : null}

          {uploadError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{uploadError}</Text>
            </View>
          ) : null}
        </SectionCard>

        <SectionCard title="2. Choose review mode" caption="This prompt controls the tone and structure of the saved review.">
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionMetaText}>
              {loadingPrompts
                ? 'Loading review modes...'
                : 'Select one analysis mode for this clip.'}
            </Text>
            <Pressable onPress={handleSyncPromptTemplates} style={styles.smallActionButton}>
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
                  style={[
                    styles.promptCard,
                    selectedPromptId === template.id && styles.promptCardSelected,
                  ]}>
                  <View style={styles.promptHeader}>
                    <Text style={styles.promptKey}>{template.key}</Text>
                    {selectedPromptId === template.id ? (
                      <StatusPill label="Selected" tone="success" />
                    ) : null}
                  </View>
                  <Text style={styles.promptTitle}>{template.title}</Text>
                  {template.description ? (
                    <Text style={styles.promptDescription}>{template.description}</Text>
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
                hint="Fetch prompt templates again"
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

        <SectionCard
          title="3. Optional focus note"
          caption="This is appended after the core prompt. Use it to narrow attention, not to replace visible evidence.">
          <TextInput
            value={userPrompt}
            onChangeText={setUserPrompt}
            placeholder="I’m the boxer on the right. Focus on guard and balance."
            placeholderTextColor={palette.textSoft}
            multiline
            style={[styles.textArea, styles.multilineInput]}
          />
        </SectionCard>

        <SectionCard
          title="4. Ready to run"
          caption="The review will use the saved clip, the active athlete profile, and the selected mode.">
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
            {reviewSubject?.description ? (
              <Text style={styles.contextBody}>{reviewSubject.description}</Text>
            ) : null}
            <View style={styles.contextRow}>
              <Text style={styles.contextLabel}>Review mode</Text>
              <Text style={styles.contextValue}>
                {selectedPrompt?.title ?? 'No review mode selected yet'}
              </Text>
            </View>
            {selectedPrompt?.description ? (
              <Text style={styles.contextBody}>{selectedPrompt.description}</Text>
            ) : null}
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
            hint="Gemini will use the saved clip, active athlete context, and selected prompt"
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
              <Text style={styles.bodyText}>Loading the active athlete profile...</Text>
            </View>
          ) : null}

          {runningAnalysis ? (
            <View style={styles.inlineStatus}>
              <ActivityIndicator color={palette.accent} />
              <Text style={styles.bodyText}>
                Sending the saved clip and context to Gemini.
              </Text>
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
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  promptKey: {
    flex: 1,
    fontSize: typography.label,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: palette.textSoft,
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
  contextBody: {
    fontSize: typography.bodySmall,
    lineHeight: 20,
    color: palette.textMuted,
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
  metaText: {
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
  uploadedState: {
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
