import { create } from 'zustand';
import { projectsAPI } from '../api/client';

const useProjectStore = create((set, get) => ({
  // State
  projects: [],
  currentProject: null,
  nodes: [],
  edges: [],
  isLoading: false,
  error: null,

  // Actions - Projects
  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectsAPI.getAll();
      set({ projects: response.projects, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  loadProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await projectsAPI.getById(id);
      const project = response.project;
      set({
        currentProject: project,
        nodes: project.data.nodes || [],
        edges: project.data.edges || [],
        isLoading: false,
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  createProject: async (name) => {
    set({ isLoading: true, error: null });
    try {
      const projectData = {
        name,
        data: {
          nodes: [],
          edges: [],
        },
      };
      const response = await projectsAPI.create(projectData);
      const newProject = response.project;

      set((state) => ({
        projects: [newProject, ...state.projects],
        currentProject: newProject,
        nodes: [],
        edges: [],
        isLoading: false,
      }));

      return newProject;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  saveProject: async () => {
    const { currentProject, nodes, edges } = get();
    if (!currentProject) return;

    set({ isLoading: true, error: null });
    try {
      const projectData = {
        name: currentProject.name,
        data: { nodes, edges },
      };

      const response = await projectsAPI.update(currentProject.id, projectData);
      const updatedProject = response.project;

      set((state) => ({
        currentProject: updatedProject,
        projects: state.projects.map((p) =>
          p.id === updatedProject.id ? updatedProject : p
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await projectsAPI.delete(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // Actions - ERD Editor
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (node) => {
    set((state) => ({
      nodes: [...state.nodes, node],
    }));
  },

  updateNode: (nodeId, updates) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node
      ),
    }));
  },

  deleteNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
    }));
  },

  // Clear current project
  clearCurrentProject: () => {
    set({
      currentProject: null,
      nodes: [],
      edges: [],
    });
  },

  // Update project name
  updateProjectName: (name) => {
    set((state) => ({
      currentProject: state.currentProject
        ? { ...state.currentProject, name }
        : null,
    }));
  },
}));

export default useProjectStore;
