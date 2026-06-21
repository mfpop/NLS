import { gql } from "@apollo/client";

export const MY_TASKS_QUERY = gql`
  query MyTasks($status: String, $priority: String, $search: String, $isOverdue: Boolean) {
    myTasks(status: $status, priority: $priority, search: $search, isOverdue: $isOverdue) {
      id
      title
      description
      status
      priority
      assignedTo
      dueDate
      sourceType
      sourceId
      sourceTitle
      sourceModule
      createdBy
      completedAt
      completedBy
      notes
      createdAt
      updatedAt
    }
  }
`;

export const TASK_QUERY = gql`
  query Task($id: Int!) {
    task(id: $id) {
      id
      title
      description
      status
      priority
      assignedTo
      dueDate
      sourceType
      sourceId
      sourceTitle
      sourceModule
      createdBy
      completedAt
      completedBy
      notes
      createdAt
      updatedAt
    }
  }
`;

export const TASK_SUMMARY_QUERY = gql`
  query TaskSummary {
    taskSummary {
      open
      inProgress
      waiting
      completed
      overdue
      dueToday
      completedThisWeek
      highPriority
      total
    }
  }
`;

export const START_TASK_MUTATION = gql`
  mutation StartTask($id: Int!) {
    startTask(id: $id) {
      task {
        id
        title
        status
        priority
        assignedTo
        dueDate
        sourceType
        sourceId
        sourceTitle
        sourceModule
        completedAt
        completedBy
        createdAt
        updatedAt
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const COMPLETE_TASK_MUTATION = gql`
  mutation CompleteTask($id: Int!, $completedBy: String) {
    completeTask(id: $id, completedBy: $completedBy) {
      task {
        id
        title
        status
        priority
        assignedTo
        dueDate
        sourceType
        sourceId
        sourceTitle
        sourceModule
        completedAt
        completedBy
        createdAt
        updatedAt
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const CANCEL_TASK_MUTATION = gql`
  mutation CancelTask($id: Int!) {
    cancelTask(id: $id) {
      task {
        id
        title
        status
        priority
        assignedTo
        dueDate
        sourceType
        sourceId
        sourceTitle
        sourceModule
        completedAt
        completedBy
        createdAt
        updatedAt
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const UPDATE_TASK_MUTATION = gql`
  mutation UpdateTask($id: Int!, $title: String, $description: String, $priority: String, $notes: String) {
    updateTask(id: $id, title: $title, description: $description, priority: $priority, notes: $notes) {
      task {
        id
        title
        description
        status
        priority
        assignedTo
        dueDate
        sourceType
        sourceId
        sourceTitle
        sourceModule
        notes
        createdAt
        updatedAt
      }
      errors {
        field
        code
        message
      }
    }
  }
`;

export const MY_WORKSPACE_DASHBOARD_QUERY = gql`
  query MyWorkspaceDashboard {
    myWorkspaceDashboard {
      openTasks
      overdueTasks
      dueToday
      inProgress
      completedToday
      waiting
      highPriority
      total
      priorityWork {
        id
        title
        description
        status
        priority
        sourceType
        sourceId
        sourceTitle
        sourceModule
        dueDate
        taskType
      }
      dueSoon {
        id
        title
        description
        status
        priority
        sourceType
        sourceId
        sourceTitle
        sourceModule
        dueDate
        taskType
      }
      recentActivity {
        id
        title
        description
        status
        priority
        sourceType
        sourceId
        sourceTitle
        sourceModule
        dueDate
        taskType
      }
    }
  }
`;
