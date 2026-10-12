import { supportService } from "../services/supportService.js";

export const supportController = {
  async getConfig(req, res) {
    res.json(await supportService.getPublicConfig());
  },
  async getCurrent(req, res) {
    res.json({ conversation: await supportService.getCurrent(req.user) });
  },
  async listMine(req, res) {
    res.json({ conversations: await supportService.listMine(req.user) });
  },
  async start(req, res) {
    res.status(201).json(await supportService.startConversation(req.user, req.body));
  },
  async getConversation(req, res) {
    res.json(await supportService.getConversation(req.user, req.params.id));
  },
  async postMessage(req, res) {
    res.status(201).json(await supportService.postMessage(req.user, req.params.id, req.body.body));
  },
  async close(req, res) {
    res.json(await supportService.close(req.user, req.params.id));
  },

  async listForStaff(req, res) {
    res.json({ conversations: await supportService.listForStaff(req.user, req.query) });
  },
  async claim(req, res) {
    res.json(await supportService.claim(req.user, req.params.id));
  },
  async assign(req, res) {
    res.json(await supportService.assign(req.user, req.params.id, req.body.agentId));
  },
  async listAgents(req, res) {
    res.json({ agents: await supportService.listAgents() });
  },
  async updateAgent(req, res) {
    res.json(await supportService.updateAgent(req.params.userId, req.body));
  },
  async getMe(req, res) {
    res.json(await supportService.getMe(req.user));
  },
  async setAvailability(req, res) {
    res.json(await supportService.setAvailability(req.user, req.body.accepting));
  },
  async getSettings(req, res) {
    res.json(await supportService.getSettings());
  },
  async updateSettings(req, res) {
    res.json(await supportService.updateSettings(req.body));
  },
};
