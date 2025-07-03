import { auditLogs } from "../models/schema.js";

export const auditLog = async (req, res, next) => {
  // เก็บข้อมูล request เดิม
  const originalSend = res.send;

  // Override res.send เพื่อจับข้อมูล response
  res.send = function (body) {
    res.locals.responseBody = body;
    return originalSend.call(this, body);
  };

  // บันทึก log หลังจาก request เสร็จสิ้น
  res.on("finish", async () => {
    try {
      const auditData = {
        userId: req.user?.id,
        action: req.method,
        endpoint: req.originalUrl,
        requestBody: req.body,
        responseBody: res.locals.responseBody,
        statusCode: res.statusCode,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        timestamp: new Date(),
      };

      await auditLogs.create(auditData);
    } catch (error) {
      console.error("Audit log error:", error);
    }
  });

  next();
};
