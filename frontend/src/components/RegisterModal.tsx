import { useState } from "react";
import {
  Alert,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Tag,
  Typography,
  message,
} from "antd";
import { TeamOutlined, UserOutlined } from "@ant-design/icons";
import { registerTeam } from "../api/client";
import { REQUEST_MESSAGES } from "../constants/messages";
import type { Course, Team } from "../types";

interface RegisterModalProps {
  open: boolean;
  course: Course | null;
  onClose: () => void;
  onRegistered: (team: Team) => void;
}

type RegisterMode = "solo" | "team";

interface FormValues {
  teamName: string;
  leaderName: string;
  contact?: string;
  mode: RegisterMode;
  members?: string[];
}

export function RegisterModal({
  open,
  course,
  onClose,
  onRegistered,
}: RegisterModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const mode = Form.useWatch("mode", form) ?? "solo";

  const resetAndClose = () => {
    form.resetFields();
    onClose();
  };

  const handleSubmit = async () => {
    if (!course) return;
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const team = await registerTeam(course.id, {
        teamName: values.teamName.trim(),
        leaderName: values.leaderName.trim(),
        contact: values.contact?.trim() || "",
        members:
          values.mode === "team"
            ? (values.members ?? []).map((name) => name.trim()).filter(Boolean)
            : undefined,
      });
      message.success(
        `${REQUEST_MESSAGES.registerSuccess}队伍编号 #${team.id}，成员 ${team.members.length} 人`
      );
      onRegistered(team);
      form.resetFields();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "报名失败，请稍后重试"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={course ? `报名 · ${course.name}` : "报名"}
      open={open}
      onCancel={resetAndClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="提交报名"
      cancelText="取消"
      destroyOnClose
      maskClosable={false}
    >
      {course && (
        <Alert
          className="register-course-alert"
          type="info"
          showIcon
          message={
            <span>
              难度 <Tag color="default">{course.difficultyLabel}</Tag>
              剩余名额{" "}
              <Typography.Text strong type={course.remainingSlots > 0 ? undefined : "danger"}>
                {course.remainingSlots}
              </Typography.Text>{" "}
              / {course.capacity} 队，截止 {course.registerDeadline.replace("T", " ").slice(0, 16)}
            </span>
          }
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{ mode: "solo" }}
        preserve={false}
        style={{ marginTop: 16 }}
      >
        <Form.Item name="mode" label="报名形式">
          <Radio.Group buttonStyle="solid">
            <Radio.Button value="solo">
              <UserOutlined /> 个人单独成队
            </Radio.Button>
            <Radio.Button value="team">
              <TeamOutlined /> 组队参加
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="teamName"
          label="队伍名称"
          rules={[{ required: true, message: "请填写队伍名称" }]}
        >
          <Input placeholder={mode === "solo" ? "如：张伟独行队" : "如：疾风队"} maxLength={120} />
        </Form.Item>

        <Form.Item
          name="leaderName"
          label="队长姓名"
          rules={[{ required: true, message: "请填写队长姓名" }]}
        >
          <Input placeholder="队长即联系人" maxLength={80} />
        </Form.Item>

        {mode === "team" && (
          <Form.Item
            name="members"
            label="队员姓名"
            extra="回车添加每名队员；队长会自动计入，同一人在本线路只能加入一支队伍。"
            rules={[
              {
                validator: (_rule, value?: string[]) => {
                  if (!value || value.length === 0) {
                    return Promise.reject(new Error("组队至少添加一名队员"));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Select
              mode="tags"
              placeholder="输入队员姓名后回车，如：韩梅梅"
              tokenSeparators={[",", "，"]}
              open={false}
              suffixIcon={<TeamOutlined />}
            />
          </Form.Item>
        )}

        <Form.Item name="contact" label="联系方式（选填）">
          <Input placeholder="手机号，便于赛前通知" maxLength={120} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
