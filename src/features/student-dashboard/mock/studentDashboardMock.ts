export type StudentDashboardCourseUpdate = {
  title: string;
  description: string;
  availability: string;
  details: string[];
  thumbnailUrl: string;
};

export type StudentDashboardCourse = {
  id: string;
  title: string;
  instructor: string;
  description: string;
  category: string;
  lessonsCount: number;
  estimatedTime: string;
  statusDetail: string;
  progress: number;
  progressLabel: string;
  thumbnailUrl: string;
  status: "In progress" | "Completed";
};

export type StudentDashboardMessage = {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  sentAt: string;
  unread?: boolean;
};

export const studentDashboardCourseUpdate: StudentDashboardCourseUpdate = {
  title: "Applied AI for Everyday Workflows",
  description:
    "A practical course on using AI tools for research, writing, planning, and task automation in day-to-day study and work.",
  availability: "New free course available for all students.",
  details: ["8 lessons", "Beginner friendly", "Self-paced access"],
  thumbnailUrl:
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
};

export const studentDashboardOngoingCourses: StudentDashboardCourse[] = [
  {
    id: "ongoing-1",
    title: "Advanced Mathematics",
    instructor: "Dr. Sarah Johnson",
    description:
      "Build confidence with advanced equations, functions, and problem-solving techniques used across higher-level coursework.",
    category: "STEM",
    lessonsCount: 12,
    estimatedTime: "6h 20m left",
    statusDetail: "Last activity yesterday",
    progress: 72,
    progressLabel: "72% complete",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?auto=format&fit=crop&w=1200&q=80",
    status: "In progress",
  },
  {
    id: "ongoing-2",
    title: "Computer Science Fundamentals",
    instructor: "Prof. Michael Chen",
    description:
      "Review core programming principles, algorithms, and code structure with practical examples and exercises.",
    category: "Technology",
    lessonsCount: 10,
    estimatedTime: "4h 10m left",
    statusDetail: "Next lesson available now",
    progress: 48,
    progressLabel: "48% complete",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
    status: "In progress",
  },
  {
    id: "ongoing-3",
    title: "Physics Laboratory",
    instructor: "Dr. Emily Davis",
    description:
      "Practice scientific observation, measurement, and reporting through guided lab-based activities and demonstrations.",
    category: "Science",
    lessonsCount: 9,
    estimatedTime: "5h 05m left",
    statusDetail: "Last activity 3 days ago",
    progress: 29,
    progressLabel: "29% complete",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&w=1200&q=80",
    status: "In progress",
  },
];

export const studentDashboardCompletedCourses: StudentDashboardCourse[] = [
  {
    id: "completed-1",
    title: "Academic Writing Essentials",
    instructor: "Dr. Nora Fields",
    description:
      "Learn how to structure essays, support arguments, and present academic ideas with stronger clarity and confidence.",
    category: "Writing",
    lessonsCount: 8,
    estimatedTime: "Completed",
    statusDetail: "Completed on Mar 12",
    progress: 100,
    progressLabel: "Completed",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
    status: "Completed",
  },
  {
    id: "completed-2",
    title: "Introduction to Statistics",
    instructor: "Prof. Daniel Morris",
    description:
      "Cover probability basics, descriptive statistics, and data interpretation for academic and practical use cases.",
    category: "Analytics",
    lessonsCount: 11,
    estimatedTime: "Completed",
    statusDetail: "Completed on Feb 28",
    progress: 100,
    progressLabel: "Completed",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    status: "Completed",
  },
];

export const studentDashboardMessages: StudentDashboardMessage[] = [
  {
    id: "message-1",
    sender: "Dr. Sarah Johnson",
    subject: "New practice sheet uploaded",
    preview:
      "The latest problem set for Advanced Mathematics is now available in your course materials.",
    sentAt: "Today, 09:20",
    unread: true,
  },
  {
    id: "message-2",
    sender: "Platform Team",
    subject: "New free course released",
    preview:
      "Applied AI for Everyday Workflows has been added to the catalog and is open to all students.",
    sentAt: "Yesterday, 16:45",
  },
  {
    id: "message-3",
    sender: "Prof. Michael Chen",
    subject: "Reminder about your next lesson",
    preview:
      "Continue with the next module in Computer Science Fundamentals to stay on track this week.",
    sentAt: "Yesterday, 11:10",
  },
];
