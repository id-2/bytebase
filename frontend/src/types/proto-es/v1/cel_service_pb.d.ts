// @generated by protoc-gen-es v2.5.2
// @generated from file v1/cel_service.proto (package bytebase.v1, syntax proto3)
/* eslint-disable */

import type { GenFile, GenMessage, GenService } from "@bufbuild/protobuf/codegenv2";
import type { Message } from "@bufbuild/protobuf";
import type { Expr } from "../google/api/expr/v1alpha1/syntax_pb";

/**
 * Describes the file v1/cel_service.proto.
 */
export declare const file_v1_cel_service: GenFile;

/**
 * @generated from message bytebase.v1.BatchParseRequest
 */
export declare type BatchParseRequest = Message<"bytebase.v1.BatchParseRequest"> & {
  /**
   * @generated from field: repeated string expressions = 1;
   */
  expressions: string[];
};

/**
 * Describes the message bytebase.v1.BatchParseRequest.
 * Use `create(BatchParseRequestSchema)` to create a new message.
 */
export declare const BatchParseRequestSchema: GenMessage<BatchParseRequest>;

/**
 * @generated from message bytebase.v1.BatchParseResponse
 */
export declare type BatchParseResponse = Message<"bytebase.v1.BatchParseResponse"> & {
  /**
   * @generated from field: repeated google.api.expr.v1alpha1.Expr expressions = 1;
   */
  expressions: Expr[];
};

/**
 * Describes the message bytebase.v1.BatchParseResponse.
 * Use `create(BatchParseResponseSchema)` to create a new message.
 */
export declare const BatchParseResponseSchema: GenMessage<BatchParseResponse>;

/**
 * @generated from message bytebase.v1.BatchDeparseRequest
 */
export declare type BatchDeparseRequest = Message<"bytebase.v1.BatchDeparseRequest"> & {
  /**
   * @generated from field: repeated google.api.expr.v1alpha1.Expr expressions = 1;
   */
  expressions: Expr[];
};

/**
 * Describes the message bytebase.v1.BatchDeparseRequest.
 * Use `create(BatchDeparseRequestSchema)` to create a new message.
 */
export declare const BatchDeparseRequestSchema: GenMessage<BatchDeparseRequest>;

/**
 * @generated from message bytebase.v1.BatchDeparseResponse
 */
export declare type BatchDeparseResponse = Message<"bytebase.v1.BatchDeparseResponse"> & {
  /**
   * @generated from field: repeated string expressions = 1;
   */
  expressions: string[];
};

/**
 * Describes the message bytebase.v1.BatchDeparseResponse.
 * Use `create(BatchDeparseResponseSchema)` to create a new message.
 */
export declare const BatchDeparseResponseSchema: GenMessage<BatchDeparseResponse>;

/**
 * @generated from service bytebase.v1.CelService
 */
export declare const CelService: GenService<{
  /**
   * Permissions required: None
   *
   * @generated from rpc bytebase.v1.CelService.BatchParse
   */
  batchParse: {
    methodKind: "unary";
    input: typeof BatchParseRequestSchema;
    output: typeof BatchParseResponseSchema;
  },
  /**
   * Permissions required: None
   *
   * @generated from rpc bytebase.v1.CelService.BatchDeparse
   */
  batchDeparse: {
    methodKind: "unary";
    input: typeof BatchDeparseRequestSchema;
    output: typeof BatchDeparseResponseSchema;
  },
}>;

