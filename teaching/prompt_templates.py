"""
Prompt Templates

Stores prompt templates for the AI Tutor system.

Templates are designed to:
- Encourage clear explanations
- Provide step-by-step guidance
- Adapt to student level
- Use retrieved context effectively
"""


class PromptTemplates:
    """
    Collection of prompt templates for different teaching scenarios.
    
    TODO:
    - Design base teaching prompt
    - Add templates for different subjects
    - Add templates for different difficulty levels
    - Include few-shot examples
    """
    
    @staticmethod
    def get_base_teaching_prompt(context: str, query: str, history: str = ""):
        """
        Get the base teaching prompt template.
        
        Args:
            context: Retrieved relevant context
            query: Student's question
            history: Conversation history (optional)
            
        Returns:
            Formatted prompt string
            
        TODO: Design effective teaching prompt
        """
        template = """
        You are an AI Tutor helping a student learn.
        
        Context from educational materials:
        {context}
        
        Conversation history:
        {history}
        
        Student's question:
        {query}
        
        Instructions:
        - Provide a clear, step-by-step explanation
        - Use the context to support your answer
        - Adapt to the student's level
        - Encourage critical thinking
        - Be patient and supportive
        
        Your response:
        """
        # TODO: Format and return the prompt
        pass
    
    @staticmethod
    def get_clarification_prompt(query: str):
        """
        Get prompt for asking clarifying questions.
        
        Args:
            query: Unclear student query
            
        Returns:
            Formatted prompt for clarification
            
        TODO: Implement clarification prompt
        """
        pass
    
    @staticmethod
    def get_encouragement_prompt(student_progress: dict):
        """
        Get prompt for providing encouragement.
        
        Args:
            student_progress: Dictionary with student progress info
            
        Returns:
            Formatted encouragement prompt
            
        TODO: Implement encouragement prompt
        """
        pass
