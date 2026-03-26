export type TeacherDashboardCourseUpdate = {
  title: string;
  description: string;
  availability: string;
  details: string[];
  thumbnailUrl: string;
};

export type TeacherDashboardCourse = {
  id: string;
  title: string;
  description: string;
  category: string;
  instructor: string;
  lessonsCount: number;
  estimatedTime: string;
  statusDetail: string;
  progress: number;
  progressLabel: string;
  thumbnailUrl: string;
  status: "Active" | "Archived";
};

export type TeacherDashboardMessage = {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  sentAt: string;
  unread?: boolean;
};

export const teacherDashboardCourseUpdate: TeacherDashboardCourseUpdate = {
  title: "Teaching with AI-Assisted Feedback",
  description:
    "A new teaching resource focused on faster feedback loops, rubric drafting, and practical AI-supported review workflows.",
  availability: "Available now for all instructors in the internal resource hub.",
  details: ["6 modules", "Instructor toolkit", "Downloadable templates"],
  thumbnailUrl:
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
};

export const teacherDashboardActiveCourses: TeacherDashboardCourse[] = [
  {
    id: "teacher-active-1",
    title: "Advanced Mathematics",
    description:
      "A structured higher-level mathematics course with weekly practice sessions, quizzes, and guided revision materials.",
    category: "STEM",
    instructor: "You",
    lessonsCount: 14,
    estimatedTime: "Next class in 2 days",
    statusDetail: "34 enrolled students",
    progress: 78,
    progressLabel: "78% course timeline complete",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?auto=format&fit=crop&w=1200&q=80",
    status: "Active",
  },
  {
    id: "teacher-active-2",
    title: "Computer Science Fundamentals",
    description:
      "Core programming and algorithm foundations delivered through live sessions, exercises, and weekly check-ins.",
    category: "Technology",
    instructor: "You",
    lessonsCount: 12,
    estimatedTime: "Assessment due Friday",
    statusDetail: "41 enrolled students",
    progress: 61,
    progressLabel: "61% course timeline complete",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80",
    status: "Active",
  },
  {
    id: "teacher-active-3",
    title: "Physics Laboratory",
    description:
      "Hands-on lab sessions with guided experiments, report reviews, and safety-focused classroom routines.",
    category: "Science",
    instructor: "You",
    lessonsCount: 10,
    estimatedTime: "Lab prep this week",
    statusDetail: "28 enrolled students",
    progress: 43,
    progressLabel: "43% course timeline complete",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1532187643603-ba119ca4109e?auto=format&fit=crop&w=1200&q=80",
    status: "Active",
  },
];

export const teacherDashboardArchivedCourses: TeacherDashboardCourse[] = [
  {
    id: "teacher-archived-1",
    title: "Academic Writing Essentials",
    description:
      "A previous writing cohort covering essay structure, argument building, and academic voice development.",
    category: "Writing",
    instructor: "You",
    lessonsCount: 8,
    estimatedTime: "Archived",
    statusDetail: "Closed after winter term",
    progress: 100,
    progressLabel: "Archived course",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
    status: "Archived",
  },
  {
    id: "teacher-archived-2",
    title: "Introduction to Statistics",
    description:
      "A completed statistics module focused on probability, data summaries, and interpretation of real-world datasets.",
    category: "Analytics",
    instructor: "You",
    lessonsCount: 11,
    estimatedTime: "Archived",
    statusDetail: "Closed after autumn term",
    progress: 100,
    progressLabel: "Archived course",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    status: "Archived",
  },
];

export const teacherDashboardMessages: TeacherDashboardMessage[] = [
  {
    id: "teacher-message-1",
    sender: "Academic Office",
    subject: "Schedule adjustment approved",
    preview:
      "Your proposed room and time changes for next week's Advanced Mathematics session have been approved.",
    sentAt: "Today, 10:15",
    unread: true,
  },
  {
    id: "teacher-message-2",
    sender: "Platform Team",
    subject: "New instructor resource published",
    preview:
      "Teaching with AI-Assisted Feedback has been added to the resource hub for all instructors.",
    sentAt: "Yesterday, 15:20",
  },
  {
    id: "teacher-message-3",
    sender: "Dr. Emily Davis",
    subject: "Shared lab rubric update",
    preview:
      "The latest version of the Physics Laboratory grading rubric is ready for reuse in your next lesson.",
    sentAt: "Yesterday, 09:05",
  },
];
