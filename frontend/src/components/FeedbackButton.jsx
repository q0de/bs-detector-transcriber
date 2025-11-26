import { useState } from "react";
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
  Input,
  useDisclosure,
} from "@heroui/react";
import { Icon } from "@iconify/react";

export default function FeedbackButton() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Log feedback - could send to backend later
      console.log('Feedback submitted:', { feedback, email });
      
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setFeedback("");
        setEmail("");
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSubmitted(false);
    setFeedback("");
    setEmail("");
  };

  return (
    <>
      <Button
        isIconOnly
        color="primary"
        variant="shadow"
        className="fixed bottom-6 right-6 z-50"
        onPress={onOpen}
        aria-label="Send feedback"
      >
        <Icon icon="solar:chat-round-dots-linear" width={24} />
      </Button>

      <Modal isOpen={isOpen} onClose={handleClose} placement="center" backdrop="blur">
        <ModalContent>
          {submitted ? (
            <ModalBody className="py-10">
              <div className="flex flex-col items-center gap-4 text-center">
                <Icon 
                  icon="solar:check-circle-bold" 
                  className="text-success" 
                  width={64} 
                />
                <h3 className="text-xl font-semibold">Thank you!</h3>
                <p className="text-default-500">We appreciate your feedback.</p>
              </div>
            </ModalBody>
          ) : (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2>Send Us Feedback</h2>
                <p className="text-sm text-default-500 font-normal">
                  We'd love to hear your thoughts, suggestions, or issues!
                </p>
              </ModalHeader>
              <ModalBody>
                <Textarea
                  label="Your Feedback"
                  placeholder="Tell us what you think..."
                  value={feedback}
                  onValueChange={setFeedback}
                  minRows={4}
                  variant="bordered"
                  isRequired
                />
                <Input
                  type="email"
                  label="Email (optional)"
                  placeholder="your@email.com"
                  value={email}
                  onValueChange={setEmail}
                  variant="bordered"
                  description="We'll only use this to follow up on your feedback."
                  startContent={
                    <Icon icon="solar:letter-linear" className="text-default-400" width={18} />
                  }
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={handleClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleSubmit}
                  isLoading={isSubmitting}
                  isDisabled={!feedback.trim()}
                >
                  Send Feedback
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

