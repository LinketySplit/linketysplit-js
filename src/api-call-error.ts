/**
 * An error thrown when an an API call fails.
 * This may be caused by a 4xx or 5xx HTTP status code.
 * If the code is in the 4xx range, the status message will be a
 * specific error message from the API.
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