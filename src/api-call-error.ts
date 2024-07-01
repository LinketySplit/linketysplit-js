/**
 * An error returned by an API call.
 * 
 */
export class ApiCallError extends Error {
  
  public statusCode: number;
  public statusMessage: string;

  constructor(message: string, statusCode: number, statusMessage: string) {
    super(message);
    this.statusCode = statusCode;
    this.statusMessage = statusMessage;
  }
}