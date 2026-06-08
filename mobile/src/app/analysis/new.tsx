import { Feather } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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
import { useAnalysisHistory } from '@/features/analysis-history/analysis-history-context';
import { sampleVideos, type SampleVideo } from '@/features/demo-videos/sample-videos';
import { useAthleteProfile } from '@/features/athlete-profile/athlete-profile-context';
import {
  getBackendPersonaKey,
} from '@/features/athlete-profile/options';
import {
  createAnalysis,
  fetchPromptTemplates,
  syncPromptTemplates,
  uploadVideoFile,
  type AnalysisRecord,
  type PromptTemplateRecord,
  type VideoRecord,
} from '@/lib/api';

type LocalVideoAsset = {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  durationMs: number | null;
};

export default function NewAnalysisScreen() {
  const router = useRouter();
  const { addAnalysis } = useAnalysisHistory();
  const { bootstrapError, isBootstrapping, profile } = useAthleteProfile();
  const [localAsset, setLocalAsset] = useState<LocalVideoAsset | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<VideoRecord | null>(null);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplateRecord[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [syncingPrompts, setSyncingPrompts] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchPromptTemplates()
      .then((templates) => {
        if (cancelled) {
          return;
        }

        setPromptTemplates(templates);
        setSelectedPromptId((current) => current ?? templates[0]?.id ?? null);
      })
      .catch((nextError: Error) => {
        if (!cancelled) {
          setError(nextError.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPrompts(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPrompt = useMemo(
    () => promptTemplates.find((template) => template.id === selectedPromptId) ?? null,
    [promptTemplates, selectedPromptId],
  );
  const personaKey = profile ? getBackendPersonaKey(profile) : null;

  async function uploadSelectedVideo(nextAsset: LocalVideoAsset) {
    setLocalAsset(nextAsset);
    setUploadedVideo(null);
    setAnalysis(null);

    setUploading(true);
    try {
      const video = await uploadVideoFile(nextAsset);
      setUploadedVideo(video);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handlePickVideo() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setError('Media library access is required to choose a boxing clip.');
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
    setError(null);
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
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Sample video could not be loaded.',
      );
    }
  }

  async function handleSyncPromptTemplates() {
    setError(null);
    setSyncingPrompts(true);
    try {
      await syncPromptTemplates();
      const templates = await fetchPromptTemplates();
      setPromptTemplates(templates);
      setSelectedPromptId((current) => current ?? templates[0]?.id ?? null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Prompt sync failed.');
    } finally {
      setSyncingPrompts(false);
    }
  }

  async function handleRunAnalysis() {
    if (!uploadedVideo || !selectedPrompt || !personaKey) {
      return;
    }

    setError(null);
    setRunningAnalysis(true);
    setAnalysis(null);

    try {
      const result = await createAnalysis({
        video_id: uploadedVideo.id,
        prompt_template_id: selectedPrompt.id,
        persona_key: personaKey,
        user_prompt: userPrompt.trim() || null,
      });
      setAnalysis(result);
      addAnalysis(result);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Analysis failed.');
    } finally {
      setRunningAnalysis(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AppScreen
        eyebrow="New analysis"
        title="Review a boxing clip."
        subtitle="Choose a local video, select a prompt, add an optional note, and run Gemini."
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

        <SectionCard title="1. Choose a boxing clip" caption="The file is uploaded to FastAPI immediately after selection.">
          <PrimaryButton
            label={localAsset ? 'Choose another clip' : 'Choose a boxing clip'}
            hint="Open the device video library"
            icon={<Feather name="upload" size={20} color="#ffffff" />}
            disabled={isBootstrapping || Boolean(bootstrapError)}
            onPress={handlePickVideo}
          />

          <View style={styles.stack}>
            <Text style={styles.fieldLabel}>Or use a local sample clip</Text>
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

          {uploading ? (
            <View style={styles.inlineStatus}>
              <ActivityIndicator color={palette.accent} />
              <Text style={styles.bodyText}>Uploading the selected clip to the backend...</Text>
            </View>
          ) : null}

          {localAsset ? (
            <View style={styles.stack}>
              <Text style={styles.stepTitle}>Selected clip</Text>
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
            <View style={styles.stack}>
              <StatusPill label="Stored locally" tone="success" />
              <Text style={styles.metaText}>
                Backend video id: {uploadedVideo.id} · {uploadedVideo.original_filename}
              </Text>
            </View>
          ) : null}
        </SectionCard>

        <SectionCard title="2. Choose the prompt" caption="The backend still reads prompt templates from PostgreSQL.">
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.stepBody}>
              {loadingPrompts
                ? 'Loading prompt templates...'
                : 'Select the prompt template that should drive Gemini.'}
            </Text>
            <Pressable onPress={handleSyncPromptTemplates} style={styles.smallActionButton}>
              <Text style={styles.smallActionLabel}>
                {syncingPrompts ? 'Syncing...' : 'Sync templates'}
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
            <Text style={styles.bodyText}>
              No prompt templates are available yet. Sync them from local files first.
            </Text>
          ) : null}
        </SectionCard>

        <SectionCard title="3. Optional focus note" caption="This remains secondary context, not ground truth.">
          <TextInput
            value={userPrompt}
            onChangeText={setUserPrompt}
            placeholder="I’m the boxer on the right. Focus on guard and balance."
            placeholderTextColor={palette.textSoft}
            multiline
            style={[styles.textArea, styles.multilineInput]}
          />
        </SectionCard>

        <SectionCard title="4. Run analysis" caption="This uses the current synchronous FastAPI + Gemini execution path.">
          <PrimaryButton
            label={runningAnalysis ? 'Running Gemini analysis...' : 'Run Gemini analysis'}
            hint="Upload must finish and a prompt must be selected"
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
                Upload completed. Waiting for Gemini to process the video and return structured feedback.
              </Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </SectionCard>

        {analysis ? (
          <SectionCard title="Result" caption="Structured feedback returned from the live analysis flow.">
            <View style={styles.resultHeader}>
              <StatusPill
                label={analysis.status}
                tone={analysis.status === 'completed' ? 'success' : 'warning'}
              />
              {analysis.parser_strategy ? (
                <Text style={styles.metaText}>Parser: {analysis.parser_strategy}</Text>
              ) : null}
            </View>

            {analysis.parsed_response ? (
              <View style={styles.resultSections}>
                <ResultSection title="Summary" items={[analysis.parsed_response.summary]} />
                <ResultSection title="Strengths" items={analysis.parsed_response.strengths} />
                <ResultSection title="Issues" items={analysis.parsed_response.issues} />
                <ResultSection title="Next steps" items={analysis.parsed_response.next_steps} />
                <ResultSection title="Notes" items={analysis.parsed_response.notes} />
              </View>
            ) : null}

            {analysis.raw_response ? (
              <View style={styles.rawResponseBox}>
                <Text style={styles.fieldLabel}>Raw response</Text>
                <Text style={styles.rawResponseText}>{analysis.raw_response}</Text>
              </View>
            ) : null}

            <PrimaryButton
              label="Open review log"
              hint="See this run inside the Analyses tab"
              onPress={() => router.push('/(tabs)/analyses')}
            />
          </SectionCard>
        ) : null}
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

function ResultSection({ title, items }: { title: string; items: string[] }) {
  const normalizedItems = items.filter((item) => item.trim().length > 0);

  if (normalizedItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.resultSection}>
      <Text style={styles.fieldLabel}>{title}</Text>
      <View style={styles.resultItems}>
        {normalizedItems.map((item) => (
          <View key={item} style={styles.resultItem}>
            <Text style={styles.resultItemBullet}>•</Text>
            <Text style={styles.resultItemText}>{item}</Text>
          </View>
        ))}
      </View>
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
  stepTitle: {
    fontSize: typography.heading,
    lineHeight: 28,
    fontWeight: '700',
    color: palette.text,
  },
  stepBody: {
    fontSize: typography.body,
    lineHeight: 24,
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
  resultHeader: {
    gap: spacing.sm,
  },
  resultSections: {
    gap: spacing.md,
  },
  resultSection: {
    gap: spacing.sm,
  },
  resultItems: {
    gap: spacing.sm,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  resultItemBullet: {
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.textSoft,
  },
  resultItemText: {
    flex: 1,
    fontSize: typography.body,
    lineHeight: 24,
    color: palette.text,
  },
  rawResponseBox: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  rawResponseText: {
    fontSize: typography.bodySmall,
    lineHeight: 22,
    color: palette.textMuted,
  },
});
