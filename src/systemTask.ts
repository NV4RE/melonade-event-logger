import { systemConsumerClient, poll, sendEvent } from './kafka';
import { ITask } from './task';
import { AllTaskType } from './workflowDefinition';
import { TaskTypes, TaskStates } from './constants/task';
import { getTaskData } from './state';
import {
  workflowInstanceStore,
  taskInstanceStore,
  workflowDefinitionStore,
} from './store';
import { WorkflowTypes } from './constants/workflow';

const processDecisionTask = async (systemTask: ITask) => {
  const workflow = await workflowInstanceStore.get(systemTask.workflowId);
  const taskData = await getTaskData(workflow);

  await taskInstanceStore.create(
    workflow,
    systemTask.decisions[systemTask.input.case]
      ? systemTask.decisions[systemTask.input.case][0]
      : systemTask.defaultDecision[0],
    taskData,
    true,
  );
};

const processParallelTask = async (systemTask: ITask) => {
  const workflow = await workflowInstanceStore.get(systemTask.workflowId);
  const taskData = await getTaskData(workflow);
  await Promise.all(
    systemTask.parallelTasks.map((tasks: AllTaskType[]) =>
      taskInstanceStore.create(workflow, tasks[0], taskData, true),
    ),
  );
};

const processSubWorkflowTask = async (systemTask: ITask) => {
  const workflowDefinition = await workflowDefinitionStore.get(
    systemTask.workflow.name,
    systemTask.workflow.rev,
  );

  if (!workflowDefinition) {
    sendEvent({
      type: 'TASK',
      transactionId: systemTask.transactionId,
      timestamp: Date.now(),
      isError: true,
      error: `Workflow: "${systemTask.workflow.name}":"${systemTask.workflow.rev}" is not exists`,
    });
    return taskInstanceStore.update({
      transactionId: systemTask.transactionId,
      taskId: systemTask.taskId,
      status: TaskStates.Failed,
      isSystem: true,
    });
  }

  return workflowInstanceStore.create(
    systemTask.transactionId,
    WorkflowTypes.SubWorkflow,
    workflowDefinition,
    systemTask.input,
    systemTask.taskId,
  );
};

export const executor = async () => {
  try {
    const tasks: ITask[] = await poll(systemConsumerClient);
    for (const task of tasks) {
      try {
        switch (task.type) {
          case TaskTypes.Decision:
            await processDecisionTask(task);
            break;
          case TaskTypes.Parallel:
            await processParallelTask(task);
            break;
          case TaskTypes.SubWorkflow:
            await processSubWorkflowTask(task);
            break;
          default:
            throw new Error(`Task: ${task.type} is not system task`);
        }
        await taskInstanceStore.update({
          isSystem: true,
          taskId: task.taskId,
          transactionId: task.transactionId,
          status: TaskStates.Completed,
        });
      } catch (error) {
        sendEvent({
          type: 'TASK',
          transactionId: task.transactionId,
          timestamp: Date.now(),
          details: task,
          isError: true,
          error: error.toString(),
        });
      }
    }
    systemConsumerClient.commit();
  } catch (error) {
    // Handle error here
    console.log(error);
  }
  setImmediate(executor);
};
