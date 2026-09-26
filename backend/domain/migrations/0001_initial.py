# Generated for lporienteering team registration & leaderboard

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Route",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True, default="")),
                ("difficulty", models.CharField(choices=[("family", "亲子"), ("adult", "成人"), ("pro", "专业")], max_length=20)),
                ("quota", models.PositiveIntegerField(help_text="队伍名额")),
                ("registration_deadline", models.DateTimeField(help_text="报名截止时间")),
                ("start_time", models.DateTimeField(help_text="赛事开始时间")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["id"]},
        ),
        migrations.CreateModel(
            name="Checkpoint",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("seq", models.PositiveIntegerField(help_text="打卡顺序")),
                ("name", models.CharField(max_length=120)),
                ("clue", models.CharField(blank=True, default="", max_length=255)),
                ("route", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="checkpoints", to="domain.route")),
            ],
            options={"ordering": ["seq"]},
        ),
        migrations.CreateModel(
            name="Team",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("route", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="teams", to="domain.route")),
            ],
            options={"ordering": ["id"]},
        ),
        migrations.CreateModel(
            name="TeamMember",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=80)),
                ("route", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="roster", to="domain.route")),
                ("team", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="members", to="domain.team")),
            ],
            options={"ordering": ["id"]},
        ),
        migrations.CreateModel(
            name="Checkin",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("checked_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("checkpoint", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="checkins", to="domain.checkpoint")),
                ("team", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="checkins", to="domain.team")),
            ],
            options={"ordering": ["checked_at", "id"]},
        ),
        migrations.AddConstraint(
            model_name="checkpoint",
            constraint=models.UniqueConstraint(fields=("route", "seq"), name="uniq_checkpoint_seq_per_route"),
        ),
        migrations.AddConstraint(
            model_name="team",
            constraint=models.UniqueConstraint(fields=("route", "name"), name="uniq_team_name_per_route"),
        ),
        migrations.AddConstraint(
            model_name="teammember",
            constraint=models.UniqueConstraint(fields=("route", "name"), name="uniq_member_per_route"),
        ),
        migrations.AddConstraint(
            model_name="teammember",
            constraint=models.UniqueConstraint(fields=("team", "name"), name="uniq_member_per_team"),
        ),
        migrations.AddConstraint(
            model_name="checkin",
            constraint=models.UniqueConstraint(fields=("team", "checkpoint"), name="uniq_checkin_per_checkpoint"),
        ),
    ]
