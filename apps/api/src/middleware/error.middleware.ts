import { errorHandler } from "node-utils-kit";
import { Request, Response, NextFunction } from "express";

export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("ERROR:", err);

  const result = errorHandler(err);
  res.status(result.statusCode).json(result.body);
};
