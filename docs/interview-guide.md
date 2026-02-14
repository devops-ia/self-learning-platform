# Interview Guide

## Overview

This platform provides a standardized, controlled environment for conducting technical interviews focused on DevOps skills. Candidates work with real infrastructure-as-code scenarios using a Monaco editor and simulated terminal, allowing you to evaluate their debugging skills, infrastructure knowledge, and CLI fluency without the overhead of managing cloud accounts or real infrastructure.

## Why Use This Platform for Interviews

### Benefits

**Standardized Environment**

- Every candidate works in the same environment with identical tooling
- Eliminates "works on my machine" variables
- Focuses purely on problem-solving skills, not environment setup

**Real-World Scenarios**

- Exercises based on actual production errors and common mistakes
- Tests practical knowledge, not just theoretical understanding
- Candidates use the same workflows they would use on the job

**Observable Process**

- Watch how candidates approach unfamiliar problems
- See their debugging methodology and thought process
- Evaluate CLI fluency and troubleshooting strategies
- Understand how they use documentation and error messages

**No Infrastructure Required**

- No AWS/GCP/Azure accounts needed
- No risk of resource leaks or unexpected costs
- No cleanup required after interviews
- Instant setup and teardown

**Objective Evaluation**

- Built-in validation provides immediate feedback
- Reduce interviewer bias through consistent criteria
- Easy to compare candidates across multiple interview sessions

## Setup

### Deploy Platform Instance

1. Deploy the platform on a server or container accessible to candidates
2. Ensure the URL is reachable from candidate machines
3. Configure HTTPS if conducting remote interviews

### Configure for Interviews

1. **Disable Public Registration**
   - Navigate to Admin Settings
   - Toggle "Allow user registration" to OFF
   - This prevents unauthorized access and ensures only invited candidates can use the platform

2. **Create Candidate Accounts**
   - Access the Admin Panel
   - Create individual accounts for each interview session
   - Use temporary credentials or provide secure password sharing
   - Consider using candidate email + interview date as username (e.g., `john.doe-2026-02-15`)

3. **Prepare Interview Sessions**
   - Select 2-4 exercises appropriate for the role level
   - Plan 15-30 minutes per exercise depending on complexity
   - Prepare follow-up questions based on exercise solutions
   - Test exercises yourself to understand expected completion time

### Interview Day Setup

1. Send candidate the platform URL and credentials 10 minutes before interview
2. Have candidate verify they can log in and see the exercise list
3. Share your screen or have candidate share theirs (preferred for remote interviews)
4. Keep notes document open for observations

## Sample Terraform Interview

### Junior/Mid-Level Position (45-60 minutes)

Use these two exercises to evaluate fundamental Terraform skills, debugging ability, and understanding of variable management and resource meta-arguments.

---

#### Exercise 1: Undeclared Variables (tf-02-variables-outputs)

**Time Allocation:** 20-25 minutes

**Exercise Description:**
The candidate receives Terraform code that references variables (`var.ami_id` and `var.instance_type`) without declaring them. Running `terraform plan` will fail with "Reference to undeclared input variable" errors.

**Initial Code:**

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = {
    Name = "web-server"
  }
}
```

**Correct Solution:**

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

variable "ami_id" {
  type    = string
  default = "ami-0c55b159cbfafe1f0"
}

variable "instance_type" {
  type    = string
  default = "t2.micro"
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = {
    Name = "web-server"
  }
}
```

**Evaluation Criteria:**

*Debugging Process (40%)*

- Does the candidate run `terraform plan` or `terraform validate` to see the error?
- Do they read and understand the error message?
- Can they identify the root cause from the error output?

*Solution Quality (40%)*

- Are both variables declared?
- Do variables include the `type` attribute (best practice)?
- Do variables include `default` values?
- Is the syntax correct?

*Understanding (20%)*

- Can they explain why variables must be declared?
- Do they understand the difference between declaration and usage?
- Can they articulate when default values are needed vs. when to use `-var` flag?

**Follow-Up Questions:**

1. "What happens if you remove the default values? How would you pass values at runtime?"
   - *Expected:* Mention `-var`, `-var-file`, environment variables (TF_VAR_*), or terraform.tfvars

2. "What other variable types besides `string` does Terraform support?"
   - *Expected:* number, bool, list, map, set, object, tuple, any

3. "How would you make a variable required (no default allowed)?"
   - *Expected:* Declare it without a default value, add validation block, or explain that lack of default makes it required

4. "In a team environment, where would you typically store variable values?"
   - *Expected:* terraform.tfvars (gitignored for secrets), .tfvars files per environment, or remote variable sets

**Red Flags:**

- Cannot identify the issue after reading error message
- Tries to remove variable references instead of declaring them
- Doesn't know how to run `terraform plan` or `terraform init`
- Cannot explain why type declaration is useful

---

#### Exercise 2: Invalid Count Meta-Argument (tf-08-invalid-count)

**Time Allocation:** 15-20 minutes

**Exercise Description:**
The candidate receives Terraform code where the `count` meta-argument is set to a string `"2"` instead of a number. This tests understanding of HCL type system and meta-arguments.

**Initial Code:**

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "web" {
  count = "2"

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  tags = {
    Name = "web-${count.index}"
  }
}
```

**Correct Solution:**

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "web" {
  count = 2

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  tags = {
    Name = "web-${count.index}"
  }
}
```

**Evaluation Criteria:**

*Problem Recognition (30%)*

- Does the candidate identify the type mismatch from error message?
- Do they understand HCL's distinction between strings and numbers?

*Solution Speed (30%)*

- This is a simple fix; should be completed quickly
- Fast completion indicates experience with Terraform

*Knowledge Depth (40%)*

- Can they explain what `count` does?
- Do they understand `count.index`?
- Can they describe when to use `count` vs. `for_each`?

**Follow-Up Questions:**

1. "What does `count.index` represent in this code?"
   - *Expected:* Zero-based index of the instance (0, 1, 2...)

2. "What happens if you change count from 2 to 5 after the resources are created?"
   - *Expected:* Terraform will create 3 additional instances; existing ones remain unchanged

3. "What happens if you change count from 5 back to 2?"
   - *Expected:* Terraform will destroy instances 2, 3, and 4 (indices are positional, so last ones are removed)

4. "When would you use `for_each` instead of `count`? What are the advantages?"
   - *Expected:* for_each uses keys instead of indices, so removing an item doesn't reindex everything; better for creating resources based on a map or set

5. "Is `count = 0` valid? When would you use it?"
   - *Expected:* Yes, valid; used for conditional resource creation (e.g., `count = var.create_monitoring ? 1 : 0`)

**Red Flags:**

- Takes too long to identify a simple type error
- Cannot explain the purpose of `count`
- Doesn't know about `for_each` as an alternative
- Cannot describe the behavior of changing count values

---

## Sample Kubernetes Interview

### Mid/Senior-Level Position (45-60 minutes)

Use these two exercises to evaluate Kubernetes debugging skills, understanding of service networking, and knowledge of health checks and probes.

---

#### Exercise 1: Service Port Misconfiguration (k8s-05-service-wrong-port)

**Time Allocation:** 20-25 minutes

**Exercise Description:**
The candidate receives a Kubernetes Service manifest that is missing the `targetPort` field. The Service exists but traffic doesn't route to containers properly because Kubernetes assumes targetPort equals port.

**Initial Code:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector:
    app: frontend
  ports:
    - protocol: TCP
      port: 8080
```

**Correct Solution:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector:
    app: frontend
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 80
```

**Evaluation Criteria:**

*Debugging Approach (40%)*

- Does the candidate use `kubectl describe svc web` to investigate?
- Do they check for Endpoints to verify pod connectivity?
- Do they understand the relationship between Service and Pods?

*Problem Understanding (35%)*

- Can they articulate the difference between `port` and `targetPort`?
- Do they understand what happens when targetPort is omitted?
- Do they verify the container's actual listening port?

*Solution Correctness (25%)*

- Is targetPort added correctly?
- Does the value match the container's listening port?
- Is YAML formatting correct?

**Follow-Up Questions:**

1. "Explain the difference between `port`, `targetPort`, and `nodePort` in a Service."
   - *Expected:*
     - `port`: Port the Service listens on within the cluster
     - `targetPort`: Port on the Pod/container where traffic is sent
     - `nodePort`: External port on each Node (only for NodePort/LoadBalancer services)

2. "How would you troubleshoot if the Service still didn't work after adding targetPort?"
   - *Expected:* Check pod labels match selector, verify pods are running and ready, check container logs, verify network policies, test with kubectl port-forward

3. "Can targetPort be a named port instead of a number? How would that work?"
   - *Expected:* Yes, can reference a port name defined in the Pod spec (e.g., `containerPort: 80, name: http`), then use `targetPort: http`

4. "What's the difference between ClusterIP, NodePort, and LoadBalancer service types?"
   - *Expected:*
     - ClusterIP: Internal only, cluster IP
     - NodePort: Exposes on each Node's IP at a static port
     - LoadBalancer: Creates external load balancer (cloud provider specific)

5. "How does the Service know which Pods to send traffic to?"
   - *Expected:* Uses label selectors; Endpoints controller watches for Pods matching the selector

**Red Flags:**

- Doesn't know how to use `kubectl describe`
- Cannot explain Service-to-Pod communication
- Doesn't understand the role of selectors and labels
- Adds targetPort with wrong value (not matching container port)

---

#### Exercise 2: Invalid Liveness Probe (k8s-10-broken-liveness)

**Time Allocation:** 20-25 minutes

**Exercise Description:**
The candidate receives a Pod manifest where the livenessProbe has an invalid port value (`eighty` instead of `8080`). This tests understanding of health checks and Kubernetes field validation.

**Initial Code:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: health-app
  labels:
    app: health
spec:
  containers:
    - name: app
      image: nginx:1.25
      ports:
        - containerPort: 8080
      livenessProbe:
        httpGet:
          path: /healthz
          port: eighty
        initialDelaySeconds: 5
        periodSeconds: 10
```

**Correct Solution:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: health-app
  labels:
    app: health
spec:
  containers:
    - name: app
      image: nginx:1.25
      ports:
        - containerPort: 8080
      livenessProbe:
        httpGet:
          path: /healthz
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 10
```

**Evaluation Criteria:**

*Error Recognition (30%)*

- Does the candidate identify the invalid port value from the error message?
- Do they understand that ports must be numeric or IANA service names?

*Probe Understanding (40%)*

- Can they explain what livenessProbe does?
- Do they know the difference between liveness, readiness, and startup probes?
- Do they understand the consequence of a failing liveness probe?

*Solution Quality (30%)*

- Is the port value corrected to match the containerPort?
- Does the candidate verify the solution with `kubectl apply`?
- Do they check that the Pod enters Running state?

**Follow-Up Questions:**

1. "What happens when a livenessProbe fails repeatedly?"
   - *Expected:* Kubernetes restarts the container, increments RESTARTS counter, may enter CrashLoopBackOff

2. "Explain the difference between livenessProbe and readinessProbe. When would you use each?"
   - *Expected:*
     - livenessProbe: Detects if container is alive; failure triggers restart
     - readinessProbe: Detects if container is ready for traffic; failure removes from Service endpoints
     - Use liveness for deadlock/hang detection, readiness for initialization or temporary unavailability

3. "What is `initialDelaySeconds` and why is it important?"
   - *Expected:* Delay before first probe; prevents probes during container startup, avoiding premature restarts

4. "What other probe mechanisms exist besides httpGet?"
   - *Expected:* exec (command execution), tcpSocket (TCP connection check), grpc (gRPC health check)

5. "What is a startupProbe and when would you use it?"
   - *Expected:* For slow-starting containers; delays liveness/readiness checks until first success, preventing startup timeouts

6. "Could you use a named port here instead of `8080`? Show an example."
   - *Expected:* Yes, define `name: http` in containerPort, then reference `port: http` in probe

**Red Flags:**

- Cannot explain what health probes do
- Doesn't know the difference between liveness and readiness
- Doesn't understand when Kubernetes restarts containers
- Cannot interpret validation error messages
- Doesn't verify their solution works

---

## Scoring Rubric

Use this rubric to evaluate candidates consistently across different interview sessions.

| Criterion | Poor (0-2 points) | Good (3-4 points) | Excellent (5 points) |
|-----------|-------------------|-------------------|----------------------|
| **Correctness** | Solution doesn't work or is incomplete; multiple errors remain | Solution works but has minor issues or lacks best practices | Perfect solution following all best practices; well-structured code |
| **Speed & Efficiency** | Takes excessive time; requires significant hints; struggles with basic concepts | Completes exercises in reasonable time with minimal hints; systematic approach | Completes quickly; identifies issues immediately; efficient debugging |
| **CLI & Tools Fluency** | Rarely uses terminal; doesn't know basic commands; copies from hints | Uses terminal regularly; knows common commands; occasional syntax lookups | Expert CLI usage; knows advanced flags; uses multiple debugging commands |
| **Debugging Methodology** | Random trial-and-error; doesn't read error messages; guesses solutions | Reads errors; uses systematic approach; asks clarifying questions | Methodical debugging; forms hypotheses; tests assumptions; explains reasoning |
| **Conceptual Understanding** | Cannot explain why solution works; weak grasp of fundamentals | Understands core concepts; can explain most decisions; some gaps in knowledge | Deep understanding; explains tradeoffs; knows edge cases; connects concepts |
| **Problem-Solving Process** | Needs heavy guidance; gives up easily; doesn't ask questions | Works independently; asks good questions; handles hints well | Self-sufficient; explores multiple angles; anticipates issues; teaches back |
| **Communication** | Unclear explanations; doesn't verbalize thinking; silent troubleshooting | Decent communication; explains major steps; responds to questions | Excellent communication; thinks aloud; explains tradeoffs; asks insightful questions |

### Scoring Guidelines

**Per Exercise:**

- **0-14 points:** Below expectations for the role
- **15-24 points:** Meets basic expectations
- **25-30 points:** Exceeds expectations
- **31-35 points:** Exceptional performance

**Overall Interview (2 exercises):**

- **0-28 points:** Do not hire
- **29-48 points:** Borderline; proceed with caution or additional assessment
- **49-60 points:** Strong candidate; recommend next round
- **61-70 points:** Exceptional candidate; fast-track

### Adjusting for Experience Level

**Junior (0-2 years):**

- Focus on correctness and willingness to learn
- Accept slower pace and more hints
- Prioritize debugging methodology over speed
- Look for fundamental understanding

**Mid-level (2-5 years):**

- Expect reasonable speed and minimal hints
- Look for best practices knowledge
- Require good CLI fluency
- Expect clear explanations

**Senior (5+ years):**

- Expect fast completion and self-sufficiency
- Require deep conceptual understanding
- Look for awareness of edge cases and production considerations
- Expect mentoring-quality explanations

## Tips for Interviewers

### Before the Interview

1. **Test exercises yourself** - Complete each exercise to understand time requirements and potential pitfalls
2. **Prepare variations** - Have backup exercises ready if candidate completes too quickly
3. **Review candidate resume** - Tailor follow-up questions to their background
4. **Set expectations** - Explain the format, time limits, and that the environment is simulated

### During the Interview

1. **Observe the process, not just the result**
   - How do they approach unknown problems?
   - What commands do they try first?
   - How do they react to error messages?
   - Do they read documentation or error messages carefully?

2. **Encourage thinking aloud**
   - Ask "What are you thinking right now?"
   - Request explanation of their debugging approach
   - This reveals their thought process even if they struggle

3. **Use strategic hints**
   - If stuck for 5+ minutes, offer a gentle nudge
   - Phrase hints as questions: "Have you tried checking...?"
   - Note how many hints were needed in your evaluation

4. **Let them struggle (briefly)**
   - Some struggle is valuable for assessment
   - Don't rescue immediately; wait 3-5 minutes
   - Struggling reveals perseverance and problem-solving creativity

5. **Ask follow-up questions even on successful solutions**
   - Test depth of understanding
   - Explore edge cases and alternatives
   - See if they got lucky or truly understand

6. **Watch for copy-paste vs. understanding**
   - Ask them to explain copied code
   - Request modifications to test comprehension
   - Look for mechanical completion vs. intentional solutions

### After Each Exercise

1. **Debrief the solution**
   - Ask candidate to explain their approach
   - Discuss alternative solutions
   - Review any mistakes and learning

2. **Take detailed notes**
   - Record time taken, hints given, approach used
   - Note specific strengths and weaknesses
   - Document interesting follow-up answers

3. **Adjust difficulty if needed**
   - If candidate breezes through, ask harder follow-ups
   - If struggling significantly, consider easier exercises

### Common Pitfalls to Avoid

1. **Don't telegraph answers** - Avoid leading questions that give away the solution
2. **Don't assume knowledge gaps mean incompetence** - Everyone has gaps; focus on learning ability
3. **Don't penalize unfamiliarity with platform** - First minute or two may be orientation
4. **Don't compare to yourself** - Use the rubric, not your personal performance expectations
5. **Don't ignore soft skills** - Communication and collaboration matter as much as technical ability
6. **Don't rush** - Allow thinking time; silence doesn't always mean stuck

### Red Flags vs. Yellow Flags

**Red Flags (Serious Concerns):**

- Cannot use basic CLI tools (`kubectl`, `terraform`) even with hints
- Doesn't read error messages before asking for help
- Cannot explain their own solution
- Gives up quickly without attempting debugging
- Shows no understanding of fundamental concepts
- Cannot articulate thought process

**Yellow Flags (Minor Concerns):**

- Slow but methodical progress
- Needs hints but uses them effectively
- Strong in some areas, weak in others
- Good understanding but poor syntax recall
- Nervous communication but solid technical skills

### Positive Signals

- Asks clarifying questions before starting
- Verbalizes debugging hypotheses
- Tests assumptions systematically
- Reads error messages carefully
- Uses multiple commands to investigate
- Explains tradeoffs in solution choices
- Suggests improvements or alternatives
- Asks about production considerations
- Demonstrates curiosity and learning mindset

### Making the Hire/No-Hire Decision

Consider the holistic picture:

1. **Role requirements** - Does their skill level match the position?
2. **Team gaps** - Do they bring needed expertise?
3. **Growth potential** - Can they learn and improve?
4. **Cultural fit** - Will they collaborate effectively?
5. **Comparable candidates** - How do they stack up against others?

Remember: Perfect scores aren't required. Look for candidates who demonstrate:

- Core competency for the level
- Effective problem-solving process
- Ability to learn and adapt
- Clear communication
- Genuine interest in the work

A mid-level candidate who scores 52/70 with great communication and learning mindset may be better than a senior candidate who scores 58/70 but shows poor collaboration skills.
