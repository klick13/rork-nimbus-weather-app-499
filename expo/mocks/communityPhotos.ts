export interface CommunityPhoto {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  imageUrl: string;
  caption: string;
  location: string;
  weatherTag: string;
  likes: number;
  comments: number;
  timestamp: string;
  isLiked: boolean;
}

export const mockCommunityPhotos: CommunityPhoto[] = [
  {
    id: "cp1",
    userId: "u1",
    username: "storm_chaser_mike",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    imageUrl: "https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=800&h=600&fit=crop",
    caption: "Incredible shelf cloud rolling in from the west. Nature's architecture at its finest.",
    location: "Oklahoma City, OK",
    weatherTag: "Severe Storm",
    likes: 342,
    comments: 47,
    timestamp: "2h ago",
    isLiked: false,
  },
  {
    id: "cp2",
    userId: "u2",
    username: "sunset_sarah",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    imageUrl: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=800&h=600&fit=crop",
    caption: "Tonight's sunset was absolutely unreal. The colors kept changing every minute 🌅",
    location: "Malibu, CA",
    weatherTag: "Clear Sky",
    likes: 891,
    comments: 63,
    timestamp: "4h ago",
    isLiked: true,
  },
  {
    id: "cp3",
    userId: "u3",
    username: "arctic_adventurer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    imageUrl: "https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=800&h=600&fit=crop",
    caption: "Fresh powder this morning. The trees look like they're wearing winter coats.",
    location: "Aspen, CO",
    weatherTag: "Heavy Snow",
    likes: 567,
    comments: 31,
    timestamp: "5h ago",
    isLiked: false,
  },
  {
    id: "cp4",
    userId: "u4",
    username: "lightning_lens",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    imageUrl: "https://images.unsplash.com/photo-1461511669078-d46bf351cd6e?w=800&h=600&fit=crop",
    caption: "Caught this bolt striking right over downtown. 30 minute exposure was worth the wait!",
    location: "Tampa, FL",
    weatherTag: "Thunderstorm",
    likes: 1203,
    comments: 89,
    timestamp: "7h ago",
    isLiked: false,
  },
  {
    id: "cp5",
    userId: "u5",
    username: "foggy_mornings",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    imageUrl: "https://images.unsplash.com/photo-1487621167305-5d248087c724?w=800&h=600&fit=crop",
    caption: "The fog lifted just enough to reveal the Golden Gate. Magical morning walk.",
    location: "San Francisco, CA",
    weatherTag: "Foggy",
    likes: 724,
    comments: 42,
    timestamp: "9h ago",
    isLiked: true,
  },
  {
    id: "cp6",
    userId: "u6",
    username: "rainbow_rita",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
    imageUrl: "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&h=600&fit=crop",
    caption: "Double rainbow appeared right after the afternoon storm passed through!",
    location: "Maui, HI",
    weatherTag: "Rain Clearing",
    likes: 1456,
    comments: 112,
    timestamp: "12h ago",
    isLiked: false,
  },
  {
    id: "cp7",
    userId: "u7",
    username: "cloud_nine_nick",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
    imageUrl: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&h=600&fit=crop",
    caption: "These lenticular clouds over the mountain range looked like UFOs today.",
    location: "Boulder, CO",
    weatherTag: "Partly Cloudy",
    likes: 398,
    comments: 28,
    timestamp: "14h ago",
    isLiked: false,
  },
  {
    id: "cp8",
    userId: "u8",
    username: "tropical_tina",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
    imageUrl: "https://images.unsplash.com/photo-1428592953211-077101b2021b?w=800&h=600&fit=crop",
    caption: "Hurricane season vibes. Staying safe but couldn't resist capturing this wall cloud.",
    location: "Galveston, TX",
    weatherTag: "Tropical Storm",
    likes: 287,
    comments: 54,
    timestamp: "1d ago",
    isLiked: false,
  },
];
