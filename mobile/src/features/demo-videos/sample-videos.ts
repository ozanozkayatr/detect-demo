export type SampleVideo = {
  id: string;
  title: string;
  filename: string;
  mimeType: string;
  moduleId: number;
};

export const sampleVideos: SampleVideo[] = [
  {
    id: 'vertical-bag-work',
    title: 'Vertical bag work',
    filename: '6296379-hd_1080_1920_25fps.mp4',
    mimeType: 'video/mp4',
    moduleId: require('../../../assets/demo-videos/6296379-hd_1080_1920_25fps.mp4'),
  },
  {
    id: 'vertical-open-gym',
    title: 'Vertical open gym',
    filename: '8810151-hd_1080_1920_24fps.mp4',
    mimeType: 'video/mp4',
    moduleId: require('../../../assets/demo-videos/8810151-hd_1080_1920_24fps.mp4'),
  },
  {
    id: 'wide-training-floor',
    title: 'Wide training floor',
    filename: '6296569-uhd_2560_1080_25fps.mp4',
    mimeType: 'video/mp4',
    moduleId: require('../../../assets/demo-videos/6296569-uhd_2560_1080_25fps.mp4'),
  },
];
