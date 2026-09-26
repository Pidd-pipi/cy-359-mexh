import { useEffect, useState } from "react";
import { Alert, Button, Form, Input, Modal, Space, message } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { ApiError, registerTeam } from "../api/client";
import { REQUEST_MESSAGES } from "../constants/messages";
import type { RaceRoute } from "../types";

interface RegisterTeamModalProps {
  route: RaceRoute | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormValues {
  name: string;
  members: string[];
}

export function RegisterTeamModal({ route, open, onClose, onSuccess }: RegisterTeamModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ members: [""] });
      setErrorText(null);
    }
  }, [open, form]);

  const handleSubmit = async () => {
    if (!route) return;
    const values = await form.validateFields();
    const members = values.members.map((item) => item.trim()).filter(Boolean);
    setSubmitting(true);
    setErrorText(null);
    try {
      await registerTeam(route.id, { name: values.name.trim(), members });
      message.success(REQUEST_MESSAGES.registerSuccess);
      onSuccess();
      onClose();
    } catch (error) {
      // 名额已满 / 成员冲突 / 报名已截止 等冲突原样展示给失败方
      const text = error instanceof ApiError ? error.message : "报名失败，请稍后重试";
      setErrorText(text);
      message.error(text);
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={route ? `报名：${route.name}` : "报名"}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      okText="提交报名"
      cancelText="取消"
      confirmLoading={submitting}
      destroyOnClose
    >
      {route && (
        <p>
          难度 {route.difficultyLabel} · 名额 {route.quota} · 剩余 {route.remaining} ·{" "}
          {route.checkpointCount} 个检查点
        </p>
      )}
      {errorText && (
        <Alert type="error" showIcon message={errorText} style={{ marginBottom: 16 }} />
      )}
      <Form form={form} layout="vertical" initialValues={{ members: [""] }}>
        <Form.Item
          name="name"
          label="队伍名称"
          rules={[{ required: true, whitespace: true, message: "请输入队伍名称" }]}
        >
          <Input placeholder="个人报名可填自己的名字" maxLength={120} />
        </Form.Item>
        <Form.List
          name="members"
          rules={[
            {
              validator: async (_, value) => {
                const filled = (value ?? []).filter((item: string) => item && item.trim());
                if (filled.length === 0) {
                  return Promise.reject(new Error("至少填写一名队员，个人报名填本人即可"));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map((field, index) => (
                <Form.Item
                  key={field.key}
                  label={index === 0 ? "队员名单（同一人只能属于一支队伍）" : ""}
                  required={false}
                  style={{ marginBottom: 8 }}
                >
                  <Space.Compact style={{ width: "100%" }}>
                    <Form.Item
                      {...field}
                      noStyle
                      rules={[{ required: true, whitespace: true, message: "请输入队员姓名" }]}
                    >
                      <Input placeholder={`队员 ${index + 1} 姓名`} maxLength={80} />
                    </Form.Item>
                    {fields.length > 1 && (
                      <Button icon={<MinusCircleOutlined />} onClick={() => remove(field.name)} />
                    )}
                  </Space.Compact>
                </Form.Item>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() => add("")}
                >
                  添加队员
                </Button>
                <Form.ErrorList errors={errors} />
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
