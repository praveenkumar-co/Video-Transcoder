import { errorHandler } from "node-utils-kit";
import { Request, Response, NextFunction } from "express";

export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // making console.error necessary to get all errors
  console.error("ERROR:", err);

  const result = errorHandler(err);
  res.status(result.statusCode).json(result.body);
};
